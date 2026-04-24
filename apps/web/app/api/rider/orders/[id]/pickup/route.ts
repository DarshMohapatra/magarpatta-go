import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRiderSession } from '@/lib/rider-session';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rider = await getRiderSession();
  if (!rider) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  if (order.riderPhone !== rider.phone) {
    return NextResponse.json({ ok: false, error: 'Not your order.' }, { status: 403 });
  }

  // Platform-rider orders are concierge-style — the rider has just placed the
  // order at the vendor's counter and paid. Pickup is allowed any time after
  // accepting. VENDOR_SELF orders never route through this endpoint.
  await prisma.order.update({
    where: { id },
    data: {
      status: 'PICKED_UP',
      pickedUpAt: order.pickedUpAt ?? new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
