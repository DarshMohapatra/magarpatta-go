import { NextResponse } from 'next/server';
import type { RiderApprovalStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

const VALID: RiderApprovalStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const url = new URL(req.url);
  const statusParam = url.searchParams.get('status');
  const where = statusParam && VALID.includes(statusParam as RiderApprovalStatus)
    ? { approvalStatus: statusParam as RiderApprovalStatus }
    : {};

  const riders = await prisma.riderProfile.findMany({
    where,
    orderBy: [{ approvalStatus: 'asc' }, { createdAt: 'desc' }],
  });

  const counts = await prisma.riderProfile.groupBy({
    by: ['approvalStatus'],
    _count: true,
  });

  return NextResponse.json({ ok: true, riders, counts });
}

interface CreateBody {
  phone?: string;
  name?: string;
  email?: string;
  aadhaarNumber?: string;
  dlNumber?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  perDropInr?: number;
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const b = (await req.json()) as CreateBody;
  const phone = (b.phone ?? '').replace(/\D/g, '').slice(-10);
  const name = (b.name ?? '').trim();
  if (phone.length !== 10 || !name) {
    return NextResponse.json({ ok: false, error: 'Phone and name required.' }, { status: 400 });
  }
  const exists = await prisma.riderProfile.findUnique({ where: { phone } });
  if (exists) return NextResponse.json({ ok: false, error: 'Rider with this phone already exists.' }, { status: 409 });

  const rider = await prisma.riderProfile.create({
    data: {
      phone,
      name,
      email: b.email?.trim() || null,
      aadhaarNumber: b.aadhaarNumber?.trim() || null,
      dlNumber: b.dlNumber?.trim() || null,
      vehicleType: b.vehicleType?.trim() || null,
      vehicleNumber: b.vehicleNumber?.trim() || null,
      perDropInr: b.perDropInr ?? 30,
      approvalStatus: 'PENDING',
    },
  });
  return NextResponse.json({ ok: true, rider });
}
