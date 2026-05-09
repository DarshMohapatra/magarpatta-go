'use client';

import { useEffect, useState } from 'react';

interface AwaitingAlert {
  id: string;
  detectedAt: string;
  distanceFromCorridorM: number;
  durationOutsideS: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  orderId: string | null;
  explanationRequestedAt: string | null;
}

/**
 * Polls /api/rider/deviations every 60s for any AWAITING_RIDER alerts on
 * this rider. When one exists, renders a sticky banner prompting them to
 * explain. Submitting the explanation closes the banner and re-checks.
 */
export function DeviationPrompt() {
  const [alerts, setAlerts] = useState<AwaitingAlert[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/rider/deviations/0/explain', { cache: 'no-store' });
      // We use a sentinel id in the path because the GET handler ignores
      // the id (lists all AWAITING_RIDER alerts for the signed-in rider).
      const body = await res.json();
      if (body.ok) setAlerts(body.alerts);
    } catch { /* swallow — banner just won't appear */ }
  }
  useEffect(() => {
    load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (alerts.length === 0) return null;
  const a = alerts[0];

  async function submit() {
    if (text.trim().length < 5 || busy) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/rider/deviations/${a.id}/explain`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ explanation: text }),
      });
      const body = await res.json();
      if (!body.ok) { setErr(body.error ?? 'Could not send'); return; }
      setText('');
      await load();
    } catch { setErr('Network error'); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-[420px] z-50">
      <div className="bg-[color:var(--color-saffron)]/15 border border-[color:var(--color-saffron)]/40 rounded-2xl p-4 shadow-lg">
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-gold)] font-medium mb-1">
          {a.severity} · admin asked for an explanation
        </div>
        <div className="text-[13px] mb-3">
          You drifted <b>{(a.distanceFromCorridorM / 1000).toFixed(2)} km</b> off route for <b>{Math.round(a.durationOutsideS / 60)} min</b>
          {a.orderId ? ` on order #${a.orderId.slice(-6).toUpperCase()}` : ' while idle'}.
        </div>
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Quick note — traffic detour, wrong address, broke down, etc."
          className="w-full bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/14 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[color:var(--color-forest)] resize-y"
        />
        {err ? <div className="mt-2 text-[12px] text-[color:var(--color-terracotta)]">{err}</div> : null}
        <div className="mt-2 flex justify-end">
          <button
            onClick={submit}
            disabled={text.trim().length < 5 || busy}
            className="px-4 py-2 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] text-[12.5px] font-medium hover:bg-[color:var(--color-forest-dark)] transition-colors disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send explanation'}
          </button>
        </div>
      </div>
    </div>
  );
}
