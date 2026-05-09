/**
 * Haversine distance in meters between two lat/lng points.
 */
export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Distance from a point P to a line segment AB, in meters. Used to
 * decide whether a rider's GPS ping is inside the allowed corridor
 * (a buffered straight line between two anchors).
 *
 * Uses an equirectangular projection — accurate enough at city scale
 * (sub-meter error over ~10km), and avoids the expensive geodesic math.
 */
export function distanceToSegmentM(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  // Project to a local meter-grid centered on `a`.
  const latRad = (a.lat * Math.PI) / 180;
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos(latRad);

  const ax = 0;
  const ay = 0;
  const bx = (b.lng - a.lng) * mPerDegLng;
  const by = (b.lat - a.lat) * mPerDegLat;
  const px = (p.lng - a.lng) * mPerDegLng;
  const py = (p.lat - a.lat) * mPerDegLat;

  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px, py);

  // Param t along the segment, clamped to [0,1].
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/**
 * The corridor envelope is the union of:
 *   - a circle of `radiusM` around `from`
 *   - a circle of `radiusM` around `to`
 *   - a rectangle of half-width `bufferM` around the segment from→to
 *
 * Returns the distance from `p` to the nearest edge of this envelope.
 * Negative = inside, positive = outside (so a return of 0 means on the
 * boundary, positive 250 = 250m beyond the corridor edge).
 */
export function distanceFromCorridorM(
  p: { lat: number; lng: number },
  from: { lat: number; lng: number; radiusM: number },
  to: { lat: number; lng: number; radiusM: number },
  bufferM: number,
): number {
  const dFrom = haversineM(p, from);
  const dTo = haversineM(p, to);
  if (dFrom <= from.radiusM) return -(from.radiusM - dFrom); // inside the from-circle
  if (dTo <= to.radiusM) return -(to.radiusM - dTo);         // inside the to-circle
  const dSeg = distanceToSegmentM(p, from, to);
  return dSeg - bufferM;
}
