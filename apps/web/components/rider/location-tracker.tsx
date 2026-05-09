'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** When provided, pings are tagged to this active order. Otherwise idle pings. */
  orderId?: string;
  /** Ping cadence in ms. 30s default — matches per the geofencing plan. */
  intervalMs?: number;
}

/**
 * Mounted on rider pages, drives a watchPosition() loop and POSTs the
 * latest fix to /api/rider/location/ping every `intervalMs`. Renders a
 * tiny status indicator so the rider can tell tracking is alive.
 *
 * Buffers pings while offline (in-memory, reset on tab close — that's
 * acceptable since we only care about live alerts and per-order distance).
 */
export function LocationTracker({ orderId, intervalMs = 30_000 }: Props) {
  const [status, setStatus] = useState<'init' | 'requesting' | 'ok' | 'denied' | 'unsupported' | 'offline' | 'no-fix'>('init');
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const latest = useRef<{ lat: number; lng: number; accuracy: number; ts: number } | null>(null);
  const buffer = useRef<{ lat: number; lng: number; accuracy: number; ts: number; orderId?: string }[]>([]);
  const watchId = useRef<number | null>(null);

  // Start the GPS watcher on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('geolocation' in navigator)) { setStatus('unsupported'); return; }
    setStatus('requesting');
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        latest.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? 0,
          ts: Date.now(),
        };
        setStatus('ok');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setStatus('denied');
        else setStatus('no-fix');
      },
      { enableHighAccuracy: false, maximumAge: 15_000, timeout: 30_000 },
    );
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  // Send loop.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tick = async () => {
      const fix = latest.current;
      if (!fix) return;
      // Drain any buffered pings first, then the current.
      const queue = buffer.current.slice();
      queue.push({ lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, ts: fix.ts, orderId });

      if (!navigator.onLine) { setStatus('offline'); buffer.current = queue; return; }
      try {
        for (const p of queue) {
          const res = await fetch('/api/rider/location/ping', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              latitude: p.lat,
              longitude: p.lng,
              accuracyM: Math.round(p.accuracy),
              orderId: p.orderId ?? null,
            }),
            keepalive: true,
          });
          if (!res.ok) throw new Error('send failed');
        }
        buffer.current = [];
        setLastSentAt(Date.now());
        setStatus('ok');
      } catch {
        buffer.current = queue;
        setStatus('offline');
      }
    };

    // First send shortly after we likely have a fix.
    const first = window.setTimeout(tick, 4_000);
    const id = window.setInterval(tick, intervalMs);
    return () => { window.clearTimeout(first); window.clearInterval(id); };
  }, [orderId, intervalMs]);

  // Tiny status pill — corner-mounted so it doesn't intrude.
  const label =
    status === 'ok'         ? `Live · last ping ${lastSentAt ? `${Math.max(0, Math.round((Date.now() - lastSentAt) / 1000))}s ago` : 'now'}` :
    status === 'requesting' ? 'GPS warming up…' :
    status === 'denied'     ? 'Location blocked — re-enable to keep your shift active' :
    status === 'unsupported'? 'Location not supported on this browser' :
    status === 'offline'    ? 'Offline — buffering pings' :
    status === 'no-fix'     ? 'Searching for GPS fix…' :
                              'Starting tracker…';

  const tone =
    status === 'ok'      ? 'bg-[color:var(--color-forest)]/12 text-[color:var(--color-forest)]' :
    status === 'denied'  ? 'bg-[color:var(--color-terracotta)]/15 text-[color:var(--color-terracotta)]' :
    status === 'offline' ? 'bg-[color:var(--color-saffron)]/15 text-[color:var(--color-gold)]' :
                           'bg-[color:var(--color-ink)]/8 text-[color:var(--color-ink-soft)]';

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-full text-[11.5px] font-medium ${tone} shadow-sm border border-[color:var(--color-ink)]/8`}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-2" />{label}
    </div>
  );
}
