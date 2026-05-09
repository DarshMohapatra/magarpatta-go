import { NextResponse } from 'next/server';
import { getRiderSession } from '@/lib/rider-session';
import { prisma } from '@/lib/prisma';
import { haversineM } from '@/lib/geo';
import { checkDeviation } from '@/lib/deviation-detection';

export const dynamic = 'force-dynamic';

/**
 * Rider's browser POSTs a GPS ping every ~30s while the tab is open.
 *   { latitude, longitude, accuracyM?, orderId? }
 *
 * If `orderId` is provided AND it belongs to this rider AND its status is
 * still in-flight, the ping is associated with the order (so we can later
 * sum the per-order distance + run the corridor check). Otherwise the
 * ping is recorded as idle (orderId = null).
 *
 * Side-effect on DELIVERED orders: when this rider has just transitioned
 * the order to DELIVERED, we recompute `distanceCoveredM` from the order's
 * pings and stamp it on the row. Idempotent — re-running is fine.
 */
export async function POST(req: Request) {
  const rider = await getRiderSession();
  if (!rider) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  let body: { latitude?: unknown; longitude?: unknown; accuracyM?: unknown; orderId?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }

  const lat = Number(body.latitude);
  const lng = Number(body.longitude);
  const acc = body.accuracyM === undefined || body.accuracyM === null ? null : Math.max(0, Math.round(Number(body.accuracyM)));
  const orderIdRaw = typeof body.orderId === 'string' ? body.orderId : null;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ ok: false, error: 'Invalid coordinates' }, { status: 400 });
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return NextResponse.json({ ok: false, error: 'Coordinates out of range' }, { status: 400 });

  const profile = await prisma.riderProfile.findUnique({ where: { phone: rider.phone }, select: { id: true } });
  if (!profile) return NextResponse.json({ ok: false, error: 'No rider profile' }, { status: 404 });

  // Validate orderId ownership if given.
  let orderId: string | null = null;
  if (orderIdRaw) {
    const order = await prisma.order.findFirst({
      where: { id: orderIdRaw, riderPhone: rider.phone },
      select: { id: true, status: true },
    });
    if (order) orderId = order.id;
  }

  await prisma.riderLocationPing.create({
    data: { riderId: profile.id, orderId, latitude: lat, longitude: lng, accuracyM: acc },
  });

  // Fire-and-forget deviation check. Failures here must never block the
  // ping write itself — riders depend on pings reaching the server even
  // if detection has a bug.
  checkDeviation({ riderId: profile.id, orderId, latitude: lat, longitude: lng, accuracyM: acc }).catch((e) => {
    console.error('[deviation] check failed:', e);
  });

  // If this ping is on a DELIVERED order, refresh the order's distance total.
  if (orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true, distanceCoveredM: true } });
    if (order?.status === 'DELIVERED') {
      const total = await sumOrderDistance(orderId);
      if (total !== order.distanceCoveredM) {
        await prisma.order.update({ where: { id: orderId }, data: { distanceCoveredM: total } });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

/**
 * Sum haversine deltas between consecutive pings on an order. Pings with
 * accuracy worse than 100m are skipped to keep noise out of the total.
 */
async function sumOrderDistance(orderId: string): Promise<number> {
  const pings = await prisma.riderLocationPing.findMany({
    where: { orderId, OR: [{ accuracyM: null }, { accuracyM: { lte: 100 } }] },
    orderBy: { createdAt: 'asc' },
    select: { latitude: true, longitude: true },
  });
  let total = 0;
  for (let i = 1; i < pings.length; i++) {
    total += haversineM(
      { lat: pings[i - 1].latitude, lng: pings[i - 1].longitude },
      { lat: pings[i].latitude, lng: pings[i].longitude },
    );
  }
  return Math.round(total);
}
