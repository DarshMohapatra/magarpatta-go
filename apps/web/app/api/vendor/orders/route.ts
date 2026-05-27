import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';

/**
 * Vendor order queue. Returns only the data a vendor needs to operate:
 * order id, items, payable subtotal, status timestamps, slot label. Customer
 * address, building/flat, phone, notes, rider identity and full order total
 * (with platform convenience fee) are deliberately NOT selected — those live
 * on the partner-management/admin console.
 */

// Single source of truth for the vendor-safe order shape. Used by every
// queue in this handler so a stray `include` can't quietly leak PII.
const VENDOR_ORDER_SELECT = {
  id: true,
  status: true,
  fulfilmentMode: true,
  placedAt: true,
  vendorAcceptedAt: true,
  vendorReadyAt: true,
  pickedUpAt: true,
  deliveredAt: true,
  cancelledAt: true,
  subtotalInr: true,
  deliverySlotLabel: true,
  deliverySlotStart: true,
  deliverySlotEnd: true,
  items: { select: { name: true, quantity: true, unit: true } },
} as const;

export async function GET() {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const base = {
    vendorId: s.vendorId,
    fulfilmentMode: 'VENDOR_SELF' as const,
  };
  const [incoming, preparing, ready, onTheWay, history, todayDelivered] = await Promise.all([
    prisma.order.findMany({
      where: { ...base, status: 'PLACED' },
      orderBy: { placedAt: 'asc' },
      select: VENDOR_ORDER_SELECT,
    }),
    prisma.order.findMany({
      where: { ...base, status: 'ACCEPTED' },
      orderBy: { vendorAcceptedAt: 'asc' },
      select: VENDOR_ORDER_SELECT,
    }),
    prisma.order.findMany({
      where: { ...base, status: { in: ['PREPARING', 'PICKED_UP'] } },
      orderBy: { vendorReadyAt: 'asc' },
      select: VENDOR_ORDER_SELECT,
    }),
    prisma.order.findMany({
      where: { ...base, status: 'OUT_FOR_DELIVERY' },
      orderBy: { pickedUpAt: 'asc' },
      select: VENDOR_ORDER_SELECT,
    }),
    prisma.order.findMany({
      where: { ...base, status: { in: ['DELIVERED', 'CANCELLED'] } },
      orderBy: { deliveredAt: 'desc' },
      take: 30,
      select: VENDOR_ORDER_SELECT,
    }),
    prisma.order.findMany({
      where: {
        ...base,
        status: 'DELIVERED',
        deliveredAt: { gte: startOfDay() },
      },
      select: { subtotalInr: true },
    }),
  ]);

  const todaySalesInr = todayDelivered.reduce((sum, o) => sum + o.subtotalInr, 0);
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
