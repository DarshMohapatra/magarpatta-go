import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await params;
  const body = (await req.json()) as { riderPhone?: string | null };
  const phone = body.riderPhone ? body.riderPhone.replace(/\D/g, '').slice(-10) : null;

  if (phone) {
    const rider = await prisma.riderProfile.findUnique({ where: { phone } });
    if (!rider || rider.approvalStatus !== 'APPROVED') {
      return NextResponse.json({ ok: false, error: 'Rider not found or not approved.' }, { status: 400 });
    }
    const order = await prisma.order.update({
      where: { id },
      data: { riderPhone: rider.phone, riderName: rider.name, riderAssignedAt: new Date() },
    });
    return NextResponse.json({ ok: true, order });
  }
  const order = await prisma.order.update({
    where: { id },
    data: { riderPhone: null, riderName: null, riderAssignedAt: null },
  });
  return NextResponse.json({ ok: true, order });
}
