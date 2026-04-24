import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Body {
  name?: string;
  phone?: string;
  email?: string;
  aadhaarNumber?: string;
  dlNumber?: string;
  vehicleType?: string;
  vehicleNumber?: string;
}

export async function POST(req: Request) {
  const b = (await req.json()) as Body;
  const name = (b.name ?? '').trim();
  const phone = (b.phone ?? '').replace(/\D/g, '').slice(-10);
  if (!name || phone.length !== 10) {
    return NextResponse.json({ ok: false, error: 'Name and 10-digit phone are required.' }, { status: 400 });
  }

  const existing = await prisma.riderProfile.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json(
      {
        ok: false,
        error:
          existing.approvalStatus === 'APPROVED'
            ? 'This phone is already a rider — sign in instead.'
            : 'An application with this phone is already on file.',
      },
      { status: 409 },
    );
  }

  const rider = await prisma.riderProfile.create({
    data: {
      phone,
      name,
      email: b.email?.trim() || null,
      aadhaarNumber: b.aadhaarNumber?.trim() || null,
      dlNumber: b.dlNumber?.trim().toUpperCase() || null,
      vehicleType: b.vehicleType?.trim() || null,
      vehicleNumber: b.vehicleNumber?.trim().toUpperCase() || null,
      perDropInr: 30,
      approvalStatus: 'PENDING',
    },
  });

  return NextResponse.json({ ok: true, riderId: rider.id });
}
