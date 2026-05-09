import 'server-only';

interface NominatimHit {
  lat: string;
  lon: string;
  display_name?: string;
}

/**
 * Geocode a free-form address string via OpenStreetMap Nominatim. Free, no
 * API key, but rate-limited to ~1 req/sec by their TOS — caller is
 * responsible for spacing out calls. Returns null when no match.
 *
 * We require a unique User-Agent (TOS), and we restrict to India for noise
 * reduction.
 */
export async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!query || query.trim().length < 4) return null;
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'in');

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'magarpatta-go/1.0 (ops@magarpatta.go)',
        'Accept-Language': 'en',
      },
      // Nominatim caches well; let Next reuse for 24h.
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const hits = (await res.json()) as NominatimHit[];
    const top = hits[0];
    if (!top) return null;
    const lat = parseFloat(top.lat);
    const lng = parseFloat(top.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch (e) {
    console.error('[geocode] failed:', e);
    return null;
  }
}
