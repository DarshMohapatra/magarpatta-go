import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';

/**
 * Vendor order queue. Groups orders for the signed-in vendor:
 *   incoming — PLACED, awaiting accept/reject
 *   preparing — ACCEPTED (vendor has accepted, not yet ready)
 *   ready — PREPARING or PICKED_UP (rider has picked up, read-only)
 *   onTheWay — OUT_FOR_DELIVERY
 *   history — last 30 delivered/cancelled
 */
export async function GET() {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  // Vendors only ever see VENDOR_SELF orders. Everything routed through a
  // Magarpatta Go rider is handled concierge-style — the rider walks into the
  // shop and orders in person, so the vendor doesn't need a notification.
  const base = {
    vendorId: s.vendorId,
    fulfilmentMode: 'VENDOR_SELF' as const,
  };
  const [incoming, preparing, ready, onTheWay, history, todayDelivered] = await Promise.all([
    prisma.order.findMany({
      where: { ...base, status: 'PLACED' },
      orderBy: { placedAt: 'asc' },
      include: { items: { select: { name: true, quantity: true, unit: true } } },
    }),
    prisma.order.findMany({
      where: { ...base, status: 'ACCEPTED' },
      orderBy: { vendorAcceptedAt: 'asc' },
      include: { items: { select: { name: true, quantity: true, unit: true } } },
    }),
    prisma.order.findMany({
      where: { ...base, status: { in: ['PREPARING', 'PICKED_UP'] } },
      orderBy: { vendorReadyAt: 'asc' },
      include: { items: { select: { name: true, quantity: true, unit: true } } },
    }),
    prisma.order.findMany({
      where: { ...base, status: 'OUT_FOR_DELIVERY' },
      orderBy: { pickedUpAt: 'asc' },
      include: { items: { select: { name: true, quantity: true, unit: true } } },
    }),
    prisma.order.findMany({
      where: { ...base, status: { in: ['DELIVERED', 'CANCELLED'] } },
      orderBy: { deliveredAt: 'desc' },
      take: 30,
      include: { items: { select: { name: true, quantity: true } } },
    }),
    prisma.order.findMany({
      where: {
        ...base,
        status: 'DELIVERED',
        deliveredAt: { gte: startOfDay() },
      },
      select: { totalInr: true, subtotalInr: true },
    }),
  ]);

  const todaySalesInr = todayDelivered.reduce((s, o) => s + o.subtotalInr, 0);
  const todayOrders = todayDelivered.length;

  return NextResponse.json({
    ok: true,
    incoming, preparing, ready, onTheWay, history,
    todaySalesInr, todayOrders,
  });
}

function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
