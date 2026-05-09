'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { DeviationSeverity, DeviationAlertStatus } from '@prisma/client';

interface Alert {
  id: string;
  detectedAt: string;
  lastLatitude: number;
  lastLongitude: number;
  distanceFromCorridorM: number;
  durationOutsideS: number;
  severity: DeviationSeverity;
  status: DeviationAlertStatus;
  explanationRequestedAt: string | null;
  riderExplanation: string | null;
  riderExplainedAt: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  rider: { id: string; name: string; phone: string; hub: { name: string; latitude: number; longitude: number } | null };
  order: {
    id: string; status: string; vendorName: string | null; vendorHub: string | null;
    society: string; building: string; flat: string;
    totalInr: number; distanceCoveredM: number | null;
    placedAt: string; deliveredAt: string | null;
  } | null;
}

interface PingPoint { lat: number; lng: number; accuracyM: number | null; at: string; onOrder: boolean }

const SEVERITY_TONE: Record<DeviationSeverity, string> = {
  LOW:    'bg-[color:var(--color-ink)]/8 text-[color:var(--color-ink-soft)]',
  MEDIUM: 'bg-[color:var(--color-saffron)]/15 text-[color:var(--color-gold)]',
  HIGH:   'bg-[color:var(--color-terracotta)]/15 text-[color:var(--color-terracotta)]',
};

const STATUS_LABEL: Record<DeviationAlertStatus, string> = {
  OPEN: 'New', AWAITING_RIDER: 'Awaiting rider', UNDER_REVIEW: 'Rider replied',
  RESOLVED: 'Resolved', DISMISSED: 'Dismissed',
};

export function AdminDeviationDetailClient({ alert, pings }: { alert: Alert; pings: PingPoint[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');

  async function act(payload: Record<string, unknown>) {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/deviations/${alert.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!body.ok) { setErr(body.error ?? 'Could not update'); return; }
      router.refresh();
    } catch { setErr('Network error'); }
    finally { setBusy(false); }
  }

  const mapsHref = `https://www.openstreetmap.org/?mlat=${alert.lastLatitude}&mlon=${alert.lastLongitude}#map=16/${alert.lastLatitude}/${alert.lastLongitude}`;

  return (
    <div>
      <Link href="/admin/deviations" className="text-[12px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]">← Queue</Link>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className={`text-[10.5px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full font-medium ${SEVERITY_TONE[alert.severity]}`}>
          {alert.severity}
        </span>
        <span className="text-[10.5px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full bg-[color:var(--color-ink)]/8 text-[color:var(--color-ink-soft)] font-medium">
          {STATUS_LABEL[alert.status]}
        </span>
      </div>
      <h1 className="mt-2 font-serif text-[28px] lg:text-[36px] leading-[1.1] tracking-[-0.01em]">
        {alert.rider.name} drifted {(alert.distanceFromCorridorM / 1000).toFixed(2)} km off route
      </h1>
      <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-soft)]">
        +91 {alert.rider.phone} · hub {alert.rider.hub?.name ?? '—'} · outside for {Math.round(alert.durationOutsideS / 60)} min
        · detected {new Date(alert.detectedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 mt-6">
        <div>
          {/* Order context */}
          {alert.order ? (
            <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4 mb-4">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">Order context</div>
              <div className="mt-1.5 text-[14px]">
                #{alert.order.id.slice(-6).toUpperCase()} · {alert.order.vendorName ?? '—'} · {alert.order.status}
              </div>
              <div className="text-[12px] text-[color:var(--color-ink-soft)]">
                Drop: flat {alert.order.flat}, {alert.order.building} · {alert.order.society}
                {alert.order.distanceCoveredM !== null
                  ? ` · ground covered ${(alert.order.distanceCoveredM / 1000).toFixed(2)} km`
                  : ' · distance pending'}
              </div>
            </div>
          ) : (
            <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4 mb-4">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">Idle deviation</div>
              <div className="mt-1.5 text-[13px]">No active order. Rider was off-hub while not on a delivery.</div>
            </div>
          )}

          {/* Ping log — text-only fallback while we don't ship a map yet */}
          <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4 mb-4">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-2">
              Pings around the deviation ({pings.length} samples · ±30 min window)
            </div>
            <div className="text-[12px] text-[color:var(--color-ink-soft)] mb-3">
              Last position: <a href={mapsHref} target="_blank" rel="noopener" className="text-[color:var(--color-forest)] underline">
                {alert.lastLatitude.toFixed(5)}, {alert.lastLongitude.toFixed(5)} — open in OSM
              </a>
            </div>
            <div className="max-h-[280px] overflow-y-auto text-[11.5px] font-mono">
              {pings.map((p, i) => (
                <div key={i} className="flex gap-3 py-0.5 border-b border-[color:var(--color-ink)]/5">
                  <span className="text-[color:var(--color-ink-soft)] w-[120px]">
                    {new Date(p.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="w-[180px]">{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</span>
                  <span className="text-[color:var(--color-ink-soft)] w-[60px]">{p.accuracyM ? `±${p.accuracyM}m` : '—'}</span>
                  <span className="text-[color:var(--color-ink-soft)]">{p.onOrder ? 'order' : 'idle'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rider explanation thread */}
          {alert.explanationRequestedAt ? (
            <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4 mb-4">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-2">Explanation</div>
              <div className="text-[12px] text-[color:var(--color-ink-soft)]">Requested {new Date(alert.explanationRequestedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
              {alert.riderExplanation ? (
                <div className="mt-3 bg-[color:var(--color-cream)] rounded-xl p-3">
                  <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-1">{alert.rider.name} replied {alert.riderExplainedAt ? `· ${new Date(alert.riderExplainedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}</div>
                  <p className="text-[13.5px] leading-[1.5] whitespace-pre-wrap">{alert.riderExplanation}</p>
                </div>
              ) : (
                <div className="mt-3 text-[12.5px] text-[color:var(--color-ink-soft)] italic">Waiting for rider's reply…</div>
              )}
            </div>
          ) : null}

          {alert.resolution ? (
            <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4 mb-4">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-1">Resolution</div>
              <p className="text-[13.5px] leading-[1.5] whitespace-pre-wrap">{alert.resolution}</p>
            </div>
          ) : null}
        </div>

        {/* Sidebar — actions */}
        <aside className="space-y-3">
          {alert.status === 'OPEN' || alert.status === 'AWAITING_RIDER' || alert.status === 'UNDER_REVIEW' ? (
            <>
              {alert.status === 'OPEN' ? (
                <button
                  onClick={() => act({ action: 'request_explanation' })}
                  disabled={busy}
                  className="w-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] py-3 rounded-full text-[13px] font-medium hover:bg-[color:var(--color-forest-dark)] transition-colors disabled:opacity-50"
                >
                  {busy ? 'Sending…' : 'Request explanation'}
                </button>
              ) : null}

              <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
                <label className="block text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-2">Resolution note (optional)</label>
                <textarea
                  rows={3}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="e.g. Verified — traffic detour around Hadapsar bridge."
                  className="w-full bg-[color:var(--color-cream)] border border-[color:var(--color-ink)]/14 rounded-xl px-3 py-2 text-[12.5px] outline-none focus:border-[color:var(--color-forest)] resize-y"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => act({ action: 'dismiss', resolution })}
                    disabled={busy}
                    className="flex-1 px-3 py-2 rounded-full border border-[color:var(--color-ink)]/14 text-[12px] hover:bg-[color:var(--color-cream)] disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => act({ action: 'resolve', resolution })}
                    disabled={busy}
                    className="flex-1 px-3 py-2 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] text-[12px] font-medium hover:bg-[color:var(--color-forest-dark)] transition-colors disabled:opacity-50"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[color:var(--color-cream-soft)] rounded-2xl p-4 text-[12.5px] text-[color:var(--color-ink-soft)] text-center">
              Closed {alert.resolvedAt ? `${new Date(alert.resolvedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}.
            </div>
          )}

          {err ? <div className="text-[12.5px] text-[color:var(--color-terracotta)]">{err}</div> : null}
        </aside>
      </div>
    </div>
  );
}
