import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRiderSession } from '@/lib/rider-session';
import { deliveryOtp } from '@/lib/orders';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rider = await getRiderSession();
  if (!rider) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as { otp?: string };
  const otp = (body.otp ?? '').replace(/\D/g, '').slice(0, 4);

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  if (order.riderPhone !== rider.phone) {
    return NextResponse.json({ ok: false, error: 'Not your order.' }, { status: 403 });
  }
  if (otp !== deliveryOtp(order.id)) {
    return NextResponse.json({ ok: false, error: 'Wrong OTP. Ask the customer to check their order page.' }, { status: 400 });
  }

  await prisma.order.update({
    where: { id },
    data: {
      status: 'DELIVERED',
      deliveredAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
