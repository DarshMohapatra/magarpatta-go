'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { DeviationSeverity, DeviationAlertStatus } from '@prisma/client';

type Scope = 'open' | 'resolved' | 'dismissed' | 'all';

interface AlertRow {
  id: string;
  detectedAt: string;
  distanceFromCorridorM: number;
  durationOutsideS: number;
  severity: DeviationSeverity;
  status: DeviationAlertStatus;
  rider: { id: string; name: string; phone: string; hub: { name: string } | null };
  order: { id: string; vendorName: string | null; society: string; building: string; status: string } | null;
}

interface Counts { open: number; resolved: number; dismissed: number; }

const SEVERITY_TONE: Record<DeviationSeverity, string> = {
  LOW:    'bg-[color:var(--color-ink)]/8 text-[color:var(--color-ink-soft)]',
  MEDIUM: 'bg-[color:var(--color-saffron)]/15 text-[color:var(--color-gold)]',
  HIGH:   'bg-[color:var(--color-terracotta)]/15 text-[color:var(--color-terracotta)]',
};

const STATUS_LABEL: Record<DeviationAlertStatus, string> = {
  OPEN: 'New',
  AWAITING_RIDER: 'Awaiting rider',
  UNDER_REVIEW: 'Rider replied',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
};

export function AdminDeviationsClient() {
  const [scope, setScope] = useState<Scope>('open');
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [counts, setCounts] = useState<Counts>({ open: 0, resolved: 0, dismissed: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load(s: Scope) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/deviations?scope=${s}`, { cache: 'no-store' });
      const body = await res.json();
      if (!body.ok) { setErr(body.error ?? 'Could not load'); setLoading(false); return; }
      setAlerts(body.alerts);
      setCounts(body.counts);
      setErr(null);
    } catch { setErr('Network error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(scope); }, [scope]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Rider deviations</div>
          <h1 className="mt-2 font-serif text-[36px] leading-[1.05] tracking-[-0.01em]">
            Off the <span className="italic text-[color:var(--color-forest)]">corridor.</span>
          </h1>
          <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)]">
            Riders who strayed from the hub→vendor→customer→hub path for over two minutes. Click any alert to see the route, the order, and request an explanation.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['open', 'resolved', 'dismissed', 'all'] as Scope[]).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] border transition-colors ${
                scope === s
                  ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] border-transparent'
                  : 'bg-[color:var(--color-paper)] text-[color:var(--color-ink-soft)] border-[color:var(--color-ink)]/14 hover:text-[color:var(--color-ink)]'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {s === 'open' ? ` · ${counts.open}` : s === 'resolved' ? ` · ${counts.resolved}` : s === 'dismissed' ? ` · ${counts.dismissed}` : ''}
            </button>
          ))}
        </div>
      </div>

      {err ? <div className="mt-6 text-[12.5px] text-[color:var(--color-terracotta)]">{err}</div> : null}
      {loading ? <div className="mt-10 text-[13px] text-[color:var(--color-ink-soft)]">Loading…</div> : null}

      {!loading && alerts.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-10 text-center">
          <p className="font-serif text-[24px]">All on-route.</p>
          <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)]">Nothing in this scope right now.</p>
        </div>
      ) : null}

      {!loading && alerts.length > 0 ? (
        <div className="mt-6 bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 overflow-hidden">
          <ul className="divide-y divide-[color:var(--color-ink)]/8">
            {alerts.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/deviations/${a.id}`}
                  className="block px-4 py-3.5 text-[13px] hover:bg-[color:var(--color-cream)] transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10.5px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full font-medium ${SEVERITY_TONE[a.severity]}`}>
                        {a.severity}
                      </span>
                      <span className="text-[10.5px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full bg-[color:var(--color-ink)]/8 text-[color:var(--color-ink-soft)] font-medium">
                        {STATUS_LABEL[a.status]}
                      </span>
                      <span className="font-medium truncate">{a.rider.name}</span>
                      <span className="text-[12px] text-[color:var(--color-ink-soft)]">· hub {a.rider.hub?.name ?? '—'}</span>
                    </div>
                    <div className="text-[12px] text-[color:var(--color-ink-soft)]">
                      {new Date(a.detectedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                  <div className="mt-1 text-[12.5px] text-[color:var(--color-ink-soft)]">
                    {(a.distanceFromCorridorM / 1000).toFixed(2)} km off route · {Math.round(a.durationOutsideS / 60)} min outside
                    {a.order
                      ? ` · order #${a.order.id.slice(-6).toUpperCase()} → ${a.order.building} (${a.order.society})`
                      : ' · idle (no active order)'}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
