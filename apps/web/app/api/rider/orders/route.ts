import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRiderSession } from '@/lib/rider-session';

/**
 * Rider buckets:
 *   available  — every PLATFORM_RIDER order that's waiting for a rider.
 *                The vendor was NOT notified; the rider walks into the shop,
 *                places the order at the counter, pays from the float, and
 *                brings it back to the customer — personalised service.
 *   active     — orders in this rider's hands right now.
 *   history    — last 20 delivered by this rider.
 *
 * Stale cutoff is 60 minutes on placedAt — older unclaimed orders drop off.
 */
export async function GET() {
  const rider = await getRiderSession();
  if (!rider) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const staleCutoff = new Date(Date.now() - 60 * 60 * 1000);
  const [available, active, history] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: 'PLACED',
        riderPhone: null,
        // Both enum values are legacy; both map to "rider walks in + buys".
        fulfilmentMode: { in: ['PLATFORM_RIDER', 'PLATFORM_RIDER_CONCIERGE'] },
        placedAt: { gte: staleCutoff },
      },
      orderBy: { placedAt: 'asc' },
      include: { items: { select: { name: true, quantity: true } } },
      take: 20,
    }),
    prisma.order.findMany({
      where: {
        riderPhone: rider.phone,
        status: { in: ['PLACED', 'ACCEPTED', 'PREPARING', 'PICKED_UP', 'OUT_FOR_DELIVERY'] },
      },
      orderBy: { riderAssignedAt: 'asc' },
      include: { items: { select: { name: true, quantity: true } } },
    }),
    prisma.order.findMany({
      where: { riderPhone: rider.phone, status: 'DELIVERED' },
      orderBy: { deliveredAt: 'desc' },
      select: { id: true, totalInr: true, deliveredAt: true, vendorName: true, society: true, building: true },
      take: 20,
    }),
  ]);

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
