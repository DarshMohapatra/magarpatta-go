import { NextResponse } from 'next/server';
import { SOCIETY_NAMES, getBuildings, getBuilding, validateFlat } from '@/lib/societies';

/**
 * Magarpatta City bounding polygon (approximate, for Phase-1 dev).
 * Replace with hand-digitized QGIS polygon once we have MTDCC master plan.
 */
const MAGARPATTA_POLYGON: Array<[number, number]> = [
  [73.9245, 18.5180],
  [73.9340, 18.5195],
  [73.9390, 18.5160],
  [73.9395, 18.5095],
  [73.9340, 18.5045],
  [73.9260, 18.5055],
  [73.9225, 18.5110],
];

function pointInPolygon(lng: number, lat: number, poly: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lat, lng, society, building, flat } = body;

    if (society) {
      if (!SOCIETY_NAMES.includes(society)) {
        return NextResponse.json({
          inside: false,
          reason: 'Unknown society — outside our delivery zone',
          society,
        });
      }

      if (!building) {
        return NextResponse.json({
          inside: true,
          reason: 'Society recognised — select building to confirm',
          society,
          buildings: getBuildings(society).map((b) => ({
            name: b.name,
            floors: b.floors,
            flatsPerFloor: b.flatsPerFloor,
          })),
        });
      }

      const b = getBuilding(society, building);
      if (!b) {
        return NextResponse.json({
          inside: false,
          reason: `Building "${building}" not found in ${society}`,
          society,
          building,
        });
      }

      if (flat) {
        const v = validateFlat(String(flat), b);
        if (!v.ok) {
          return NextResponse.json({
            inside: false,
            reason: v.reason,
            hint: v.hint,
            society,
            building,
            flat,
          });
        }
        return NextResponse.json({
          inside: true,
          reason: 'Address is within Magarpatta City',
          society,
          building,
          flat,
          floor: v.floor,
          unit: v.unit,
        });
      }

      return NextResponse.json({
        inside: true,
        reason: 'Building recognised — provide flat to confirm',
        society,
        building,
        floors: b.floors,
        flatsPerFloor: b.flatsPerFloor,
      });
    }

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { inside: false, error: 'Provide { society, building, flat } or { lat, lng }' },
        { status: 400 },
      );
    }

    const inside = pointInPolygon(lng, lat, MAGARPATTA_POLYGON);
    return NextResponse.json({
      inside,
      reason: inside
        ? 'Coordinates are within Magarpatta geofence'
        : 'Coordinates are outside Magarpatta City',
      lat,
      lng,
    });
  } catch {
    return NextResponse.json({ inside: false, error: 'Bad request' }, { status: 400 });
  }
}
