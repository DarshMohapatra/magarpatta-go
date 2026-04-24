import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRiderSession } from '@/lib/rider-session';

/**
 * Returns two buckets for the rider:
 *   available — PLACED + not yet claimed by any rider
 *   active    — claimed by *this* rider, still in transit
 *   history   — last 20 delivered by this rider (for earnings display)
 */
export async function GET() {
  const rider = await getRiderSession();
  if (!rider) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  // Strict guardrail: riders only see currently-pickable orders.
  //   - platform-rider mode (not vendor self-delivery)
  //   - vendor has already accepted (ACCEPTED or PREPARING)
  //   - no rider is assigned yet
  //   - vendor accepted within the last 60 minutes (stale orders drop off)
  const staleCutoff = new Date(Date.now() - 60 * 60 * 1000);
  const [available, active, history] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: { in: ['ACCEPTED', 'PREPARING'] },
        riderPhone: null,
        fulfilmentMode: 'PLATFORM_RIDER',
        vendorAcceptedAt: { gte: staleCutoff },
      },
      orderBy: { vendorAcceptedAt: 'asc' },
      include: { items: { select: { name: true, quantity: true } } },
      take: 20,
    }),
    prisma.order.findMany({
      where: {
        riderPhone: rider.phone,
        status: { in: ['ACCEPTED', 'PREPARING', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
      },
      orderBy: { acceptedAt: 'asc' },
      include: { items: { select: { name: true, quantity: true } } },
    }),
    prisma.order.findMany({
      where: { riderPhone: rider.phone, status: 'DELIVERED' },
      orderBy: { deliveredAt: 'desc' },
      select: { id: true, totalInr: true, deliveredAt: true, vendorName: true, society: true, building: true },
      take: 20,
    }),
  ]);

  // Today's earnings
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayDrops = history.filter((o) => o.deliveredAt && o.deliveredAt >= todayStart).length;
  const todayEarningsInr = todayDrops * rider.perDropInr;

  return NextResponse.json({
    ok: true,
    rider,
    available,
    active,
    history,
    todayDrops,
    todayEarningsInr,
  });
}
