'use client';

import { useEffect, useState } from 'react';

interface Change {
  id: string;
  entity: 'VENDOR' | 'PRODUCT' | 'RIDER';
  entityId: string | null;
  operation: 'UPDATE' | 'CREATE' | 'DELETE';
  payload: Record<string, unknown>;
  before: Record<string, unknown> | null;
  summary: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  vendor: { id: string; name: string; slug: string; hub: string } | null;
}

const TABS: Array<{ key: string; label: string }> = [
  { key: 'PENDING', label: 'Awaiting review' },
  { key: 'APPROVED', label: 'Applied' },
  { key: 'REJECTED', label: 'Rejected' },
];

export function AdminChangesClient({ initialStatus }: { initialStatus: string }) {
  const [tab, setTab] = useState(TABS.find((t) => t.key === initialStatus)?.key ?? 'PENDING');
  const [changes, setChanges] = useState<Change[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Change | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch(`/api/admin/pending-changes?status=${tab}`, { cache: 'no-store' });
    const j = await r.json();
    if (j.ok) {
      setChanges(j.changes);
      const c: Record<string, number> = {};
      for (const row of j.counts) c[row.status] = row._count;
      setCounts(c);
    }
  }

  useEffect(() => { load(); setSelected(null); setNote(''); }, [tab]); // eslint-disable-line

  async function act(id: string, action: 'approve' | 'reject') {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/pending-changes/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      const j = await r.json();
      if (!j.ok) { alert(j.error ?? 'Action failed'); return; }
      setSelected(null);
      setNote('');
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6">
      <div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Approval queue</div>
          <h1 className="mt-2 font-serif text-[32px] sm:text-[40px] leading-[1.02] tracking-[-0.02em]">
            Vendor + rider edits, <span className="italic text-[color:var(--color-forest)]">on your desk.</span>
          </h1>
          <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)]">
            Every config change a partner makes lands here before going live. Operational actions (accepting orders, pause/unpause, stock toggle) bypass this queue.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] border ${
                tab === t.key
                  ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] border-[color:var(--color-forest)]'
                  : 'bg-[color:var(--color-paper)] text-[color:var(--color-ink-soft)] border-[color:var(--color-ink)]/12 hover:text-[color:var(--color-forest)]'
              }`}
            >
              {t.label} <span className="ml-1.5 opacity-70">{counts[t.key] ?? 0}</span>
            </button>
          ))}
        </div>

        <ul className="mt-5 space-y-3">
          {changes.length === 0 && (
            <li className="rounded-xl border border-dashed border-[color:var(--color-ink)]/15 p-6 text-center text-[13px] text-[color:var(--color-ink-soft)]/70">
              Nothing in this tab.
            </li>
          )}
          {changes.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setSelected(c)}
                className={`w-full text-left rounded-2xl border p-4 hover:border-[color:var(--color-forest)]/35 transition-colors ${
                  selected?.id === c.id
                    ? 'border-[color:var(--color-forest)]/45 bg-[color:var(--color-forest)]/5'
                    : 'border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/60">
                      {c.entity.toLowerCase()} · {c.operation.toLowerCase()}
                    </div>
                    <div className="font-serif text-[16px] leading-tight truncate">{c.summary}</div>
                    {c.vendor && <div className="text-[12px] text-[color:var(--color-ink-soft)]/75 truncate">{c.vendor.hub}</div>}
                  </div>
                  <div className="text-[11px] text-[color:var(--color-ink-soft)]/60 shrink-0">
                    {new Date(c.submittedAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <aside className="lg:sticky lg:top-[130px] lg:self-start">
        {!selected ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--color-ink)]/15 p-10 text-center text-[13px] text-[color:var(--color-ink-soft)]/70">
            Select a change to see the diff.
          </div>
        ) : (
          <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6 space-y-5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">{selected.entity.toLowerCase()} · {selected.operation.toLowerCase()}</div>
              <h2 className="mt-1 font-serif text-[22px] leading-tight">{selected.summary}</h2>
              {selected.vendor && (
                <p className="text-[12.5px] text-[color:var(--color-ink-soft)]">{selected.vendor.name} · {selected.vendor.hub}</p>
              )}
              <p className="text-[11.5px] text-[color:var(--color-ink-soft)]/65 mt-1">
                Submitted {new Date(selected.submittedAt).toLocaleString('en-IN')}
              </p>
            </div>

            <Diff payload={selected.payload} before={selected.before} operation={selected.operation} />

            {selected.status === 'PENDING' && (
              <>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Note (sent on reject)</span>
                  <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-3 py-2 text-[13.5px] outline-none focus:border-[color:var(--color-forest)]" />
                </label>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button disabled={busy} onClick={() => act(selected.id, 'approve')}
                    className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-4 py-2 text-[12.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50">
                    Approve + apply
                  </button>
                  <button disabled={busy} onClick={() => act(selected.id, 'reject')}
                    className="rounded-full border border-[color:var(--color-terracotta)]/40 text-[color:var(--color-terracotta)] px-4 py-2 text-[12.5px] hover:bg-[color:var(--color-terracotta)]/8 disabled:opacity-50">
                    Reject
                  </button>
                </div>
              </>
            )}

            {selected.status !== 'PENDING' && selected.reviewNote && (
              <div className="rounded-xl bg-[color:var(--color-terracotta)]/8 border border-[color:var(--color-terracotta)]/20 px-4 py-3 text-[12.5px]">
                <span className="text-[color:var(--color-ink-soft)]/70">Reviewer note:</span> {selected.reviewNote}
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function Diff({ payload, before, operation }: { payload: Record<string, unknown>; before: Record<string, unknown> | null; operation: string }) {
  const keys = Array.from(new Set([...Object.keys(payload || {}), ...Object.keys(before || {})]));
  if (operation === 'DELETE') {
    return (
      <div className="rounded-xl border border-[color:var(--color-terracotta)]/25 bg-[color:var(--color-terracotta)]/6 px-4 py-3 text-[13px]">
        Vendor wants to remove this item from the menu.
        {before?.name ? <span className="block mt-0.5 text-[12px] text-[color:var(--color-ink-soft)]">"{String(before.name)}"</span> : null}
      </div>
    );
  }
  if (keys.length === 0) {
    return <div className="text-[12.5px] text-[color:var(--color-ink-soft)]/70">No fields in payload.</div>;
  }
  return (
    <div className="rounded-xl border border-[color:var(--color-ink)]/10 divide-y divide-[color:var(--color-ink)]/8 text-[12.5px]">
      {keys.map((k) => (
        <div key={k} className="grid grid-cols-[120px_1fr] gap-3 px-3 py-2">
          <div className="uppercase tracking-[0.12em] text-[10.5px] text-[color:var(--color-ink-soft)]/65 self-start pt-0.5">{k}</div>
          <div className="space-y-1">
            {operation === 'UPDATE' && before && k in before && (
              <div className="line-through text-[color:var(--color-ink-soft)]/55">{fmt(before[k])}</div>
            )}
            {k in payload && <div className="text-[color:var(--color-forest)]">{fmt(payload[k])}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function fmt(v: unknown): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'on' : 'off';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  return String(v);
}
