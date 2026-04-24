import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRiderSession } from '@/lib/rider-session';

/**
 * Buckets for the rider dashboard:
 *   available  — platform-rider orders the vendor has marked READY (PREPARING).
 *                Strict gate: no picking up until the vendor flips ready.
 *   concierge  — off-platform orders the vendor isn't aware of. The rider
 *                walks into the shop, orders and pays in person, and brings
 *                the order back to the customer.
 *   active     — orders currently in this rider's hands.
 *   history    — last 20 delivered, for earnings display.
 *
 * Stale cutoff: 60 minutes — any order whose trigger timestamp is older
 * than that falls off the queue regardless of other state.
 */
export async function GET() {
  const rider = await getRiderSession();
  if (!rider) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const staleCutoff = new Date(Date.now() - 60 * 60 * 1000);
  const [available, concierge, active, history] = await Promise.all([
    // Vendor-ready platform-rider orders only. No rider-visibility before READY.
    prisma.order.findMany({
      where: {
        status: 'PREPARING',
        riderPhone: null,
        fulfilmentMode: 'PLATFORM_RIDER',
        vendorReadyAt: { gte: staleCutoff },
      },
      orderBy: { vendorReadyAt: 'asc' },
      include: { items: { select: { name: true, quantity: true } } },
      take: 20,
    }),
    // Concierge — vendor never accepts; rider acts as personal shopper.
    prisma.order.findMany({
      where: {
        status: 'PLACED',
        riderPhone: null,
        fulfilmentMode: 'PLATFORM_RIDER_CONCIERGE',
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
    concierge,
    active,
    history,
    todayDrops,
    todayEarningsInr,
  });
}
