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

  // Pickup gate:
  //   PLATFORM_RIDER    — only once the vendor has marked ready (status=PREPARING)
  //   CONCIERGE         — rider just walked in + paid at the shop; always allowed
  //   (VENDOR_SELF doesn't route through this endpoint.)
  if (order.fulfilmentMode === 'PLATFORM_RIDER' && order.status !== 'PREPARING') {
    return NextResponse.json(
      { ok: false, error: 'Vendor has not marked this order ready yet. Wait for their Ready for pickup.' },
      { status: 409 },
    );
  }

  await prisma.order.update({
    where: { id },
    data: {
      status: 'PICKED_UP',
      pickedUpAt: order.pickedUpAt ?? new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
