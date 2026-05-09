import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import { geocodeAddress } from '@/lib/geocode';

export const dynamic = 'force-dynamic';

/**
 * Idempotent seed for the demo hubs. Admin-only. Each hub is upserted
 * by slug; coordinates come from Nominatim if not already set. Safe to
 * re-run any time — existing hubs keep their current lat/lng.
 *
 * Run once after the schema migration:
 *   curl -X POST .../api/admin/hubs/seed -H 'Cookie: mg_admin_session=...'
 */
const HUBS: { slug: string; name: string; query: string; fallbackLat: number; fallbackLng: number; radiusM: number }[] = [
  { slug: 'magarpatta-market', name: 'Magarpatta Market',  query: 'Magarpatta Market, Magarpatta City, Hadapsar, Pune',  fallbackLat: 18.51678, fallbackLng: 73.93330, radiusM: 150 },
  { slug: 'seasons-mall',      name: 'Seasons Mall',       query: 'Seasons Mall, Magarpatta City, Hadapsar, Pune',       fallbackLat: 18.51891, fallbackLng: 73.93561, radiusM: 200 },
  { slug: 'destination-centre', name: 'Destination Centre', query: 'Destination Centre, Magarpatta City, Hadapsar, Pune', fallbackLat: 18.51740, fallbackLng: 73.93420, radiusM: 150 },
  { slug: 'amanora-mall',      name: 'Amanora Mall',       query: 'Amanora Mall, Hadapsar, Pune',                        fallbackLat: 18.51610, fallbackLng: 73.94280, radiusM: 200 },
];

export async function POST() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const results: { slug: string; status: 'created' | 'kept' | 'updated'; lat: number; lng: number }[] = [];

  for (const h of HUBS) {
    const existing = await prisma.hub.findUnique({ where: { slug: h.slug } });
    if (existing) {
      results.push({ slug: h.slug, status: 'kept', lat: existing.latitude, lng: existing.longitude });
      continue;
    }
    // Try to geocode; fall back to known coords if the lookup fails.
    let lat = h.fallbackLat;
    let lng = h.fallbackLng;
    const geo = await geocodeAddress(h.query);
    if (geo) { lat = geo.lat; lng = geo.lng; }

    const created = await prisma.hub.create({
      data: { slug: h.slug, name: h.name, latitude: lat, longitude: lng, radiusM: h.radiusM },
    });
    results.push({ slug: h.slug, status: 'created', lat: created.latitude, lng: created.longitude });

    // Nominatim asks for ~1 req/sec spacing.
    await new Promise((r) => setTimeout(r, 1100));
  }

  return NextResponse.json({ ok: true, hubs: results });
}
