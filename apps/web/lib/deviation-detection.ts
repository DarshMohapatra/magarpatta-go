import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { distanceFromCorridorM, haversineM } from './geo';
import { logActivity } from './activity-log';

/**
 * The "envelope" a rider is allowed to be inside for the current order
 * phase. Two anchors (each with its own geofence radius) plus a corridor
 * buffer between them.
 */
interface Envelope {
  from: { lat: number; lng: number; radiusM: number };
  to:   { lat: number; lng: number; radiusM: number };
  bufferM: number;
}

const VENDOR_RADIUS_M    = 80;
const CUSTOMER_RADIUS_M  = 60;
const CORRIDOR_BUFFER_M  = 300;

/** How long the rider has to be outside before we consider it a deviation. */
const DEVIATION_WINDOW_S = 120;

/** Minimum gap between two alerts on the same rider. Prevents alert spam. */
const ALERT_DEBOUNCE_S   = 30 * 60;

/**
 * Build the allowed envelope for the rider's current state. Returns null
 * if we can't compute it (missing hub, missing vendor coords, etc.) — in
 * which case detection is skipped (we don't want false positives caused
 * by missing data).
 */
async function buildEnvelopeForOrder(orderId: string): Promise<Envelope | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      vendorId: true,
      society: true, building: true,
      riderPhone: true,
      hubIdAtAccept: true,
    },
  });
  if (!order || !order.riderPhone) return null;

  // Hub the rider belongs to (or the snapshot at accept time, whichever is set).
  const rider = await prisma.riderProfile.findUnique({
    where: { phone: order.riderPhone },
    select: { hubId: true },
  });
  const hubId = order.hubIdAtAccept ?? rider?.hubId ?? null;
  if (!hubId) return null;

  const hub = await prisma.hub.findUnique({
    where: { id: hubId },
    select: { latitude: true, longitude: true, radiusM: true },
  });
  if (!hub) return null;

  const vendor = order.vendorId ? await prisma.vendor.findUnique({
    where: { id: order.vendorId },
    select: { latitude: true, longitude: true },
  }) : null;

  const customerAddr = await prisma.userAddress.findFirst({
    where: { society: order.society, building: order.building },
    select: { latitude: true, longitude: true },
  });

  const hubAnchor      = { lat: hub.latitude, lng: hub.longitude, radiusM: hub.radiusM };
  const vendorAnchor   = vendor && vendor.latitude !== null && vendor.longitude !== null
    ? { lat: vendor.latitude, lng: vendor.longitude, radiusM: VENDOR_RADIUS_M } : null;
  const customerAnchor = customerAddr && customerAddr.latitude !== null && customerAddr.longitude !== null
    ? { lat: customerAddr.latitude, lng: customerAddr.longitude, radiusM: CUSTOMER_RADIUS_M } : null;

  // Phase by order status:
  //   ACCEPTED / PREPARING       → hub → vendor (or hub→hub fallback if vendor coords missing)
  //   PICKED_UP / OUT_FOR_DELIVERY → vendor → customer (need both)
  //   DELIVERED                  → customer → hub (return leg)
  if (order.status === 'ACCEPTED' || order.status === 'PREPARING') {
    if (!vendorAnchor) return null;
    return { from: hubAnchor, to: vendorAnchor, bufferM: CORRIDOR_BUFFER_M };
  }
  if (order.status === 'PICKED_UP' || order.status === 'OUT_FOR_DELIVERY') {
    if (!vendorAnchor || !customerAnchor) return null;
    return { from: vendorAnchor, to: customerAnchor, bufferM: CORRIDOR_BUFFER_M };
  }
  if (order.status === 'DELIVERED') {
    if (!customerAnchor) return null;
    return { from: customerAnchor, to: hubAnchor, bufferM: CORRIDOR_BUFFER_M };
  }
  return null;
}

/**
 * Idle envelope = stay near your hub. Single anchor, with a generous
 * buffer — riders can roam ~1km from the hub when not on an order.
 */
async function buildIdleEnvelope(riderId: string): Promise<Envelope | null> {
  const rider = await prisma.riderProfile.findUnique({
    where: { id: riderId },
    select: { hubId: true },
  });
  if (!rider?.hubId) return null;
  const hub = await prisma.hub.findUnique({
    where: { id: rider.hubId },
    select: { latitude: true, longitude: true, radiusM: true },
  });
  if (!hub) return null;
  const anchor = { lat: hub.latitude, lng: hub.longitude, radiusM: hub.radiusM };
  // Both endpoints = hub; corridor degenerates to a single circle of radius
  // hub.radiusM + idleBuffer. We use the existing helper for consistency.
  return { from: anchor, to: anchor, bufferM: 1_000 };
}

interface CheckArgs {
  riderId: string;
  orderId: string | null;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
}

/**
 * Run after every ping. If the rider has been outside the envelope for
 * ≥DEVIATION_WINDOW_S, fire an alert (debounced by ALERT_DEBOUNCE_S).
 */
export async function checkDeviation(args: CheckArgs): Promise<void> {
  const envelope = args.orderId
    ? await buildEnvelopeForOrder(args.orderId)
    : await buildIdleEnvelope(args.riderId);
  if (!envelope) return;

  const dCorridor = distanceFromCorridorM(
    { lat: args.latitude, lng: args.longitude },
    envelope.from,
    envelope.to,
    envelope.bufferM,
  );

  // Inside envelope → nothing to do.
  if (dCorridor <= 0) return;

  // Throw out terrible-accuracy pings — they cause false alarms.
  if (args.accuracyM !== null && args.accuracyM > 200) return;

  // Look at recent pings to figure out how long the rider has been outside.
  const since = new Date(Date.now() - 30 * 60 * 1000);
  const recent = await prisma.riderLocationPing.findMany({
    where: { riderId: args.riderId, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });

  let outsideStart: Date | null = null;
  // Walk backward from the most recent ping; stop at the first one that
  // was inside the envelope (or when we run out of pings).
  for (const p of recent) {
    const d = distanceFromCorridorM(
      { lat: p.latitude, lng: p.longitude },
      envelope.from, envelope.to, envelope.bufferM,
    );
    if (d > 0) outsideStart = p.createdAt;
    else break;
  }
  if (!outsideStart) return;

  const durationS = Math.round((Date.now() - outsideStart.getTime()) / 1000);
  if (durationS < DEVIATION_WINDOW_S) return;

  // Debounce: don't fire if there's an unresolved or recent alert for this
  // rider.
  const recentAlert = await prisma.riderDeviationAlert.findFirst({
    where: {
      riderId: args.riderId,
      detectedAt: { gte: new Date(Date.now() - ALERT_DEBOUNCE_S * 1000) },
    },
    orderBy: { detectedAt: 'desc' },
  });
  if (recentAlert && recentAlert.status !== 'RESOLVED' && recentAlert.status !== 'DISMISSED') return;

  // Severity ladder:
  //   distance >2km OR duration >15min OR  → HIGH
  //   distance >500m OR duration >5min     → MEDIUM
  //   otherwise                            → LOW
  const severity = (dCorridor > 2_000 || durationS > 15 * 60) ? 'HIGH'
                 : (dCorridor > 500   || durationS > 5  * 60) ? 'MEDIUM'
                 : 'LOW';

  await prisma.riderDeviationAlert.create({
    data: {
      riderId: args.riderId,
      orderId: args.orderId,
      lastLatitude: args.latitude,
      lastLongitude: args.longitude,
      distanceFromCorridorM: Math.round(dCorridor),
      durationOutsideS: durationS,
      severity,
    },
  });

  const rider = await prisma.riderProfile.findUnique({ where: { id: args.riderId }, select: { name: true } });
  logActivity({
    actorRole: 'RIDER',
    actorId: args.riderId,
    actorName: rider?.name ?? 'Rider',
    action: 'RIDER_DEVIATION',
    summary: `${rider?.name ?? 'Rider'} drifted ${Math.round(dCorridor)}m off route for ${durationS}s${args.orderId ? ` on order #${args.orderId.slice(-6).toUpperCase()}` : ' (idle)'}`,
    metadata: { orderId: args.orderId, distanceM: Math.round(dCorridor), durationS, severity } satisfies Prisma.InputJsonValue,
  });
}

/**
 * Compute the actual route distance for an order from its pings — the
 * "ground truth" distance. Same logic as in the ping route, exported for
 * the admin detail view.
 */
export async function computeOrderDistanceM(orderId: string): Promise<number> {
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
