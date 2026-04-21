import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRiderSession } from '@/lib/rider-session';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rider = await getRiderSession();
  if (!rider) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  if (order.riderPhone && order.riderPhone !== rider.phone) {
    return NextResponse.json({ ok: false, error: 'Another rider claimed this order.' }, { status: 409 });
  }

  await prisma.order.update({
    where: { id },
    data: {
      riderPhone: rider.phone,
      riderName: rider.name,
      status: 'ACCEPTED',
      acceptedAt: order.acceptedAt ?? new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
