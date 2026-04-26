'use client';

import { useEffect, useState } from 'react';
import { CAMPAIGN_TYPE_LABELS } from '@/lib/campaign-types';

interface Campaign {
  id: string;
  type: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  productIds: string[];
  discountPct: number | null;
  startsAt: string;
  endsAt: string;
  active: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvalNote: string | null;
  submittedAt: string;
  vendor: { id: string; name: string; slug: string; hub: string };
}

const TABS: Array<{ key: string; label: string }> = [
  { key: 'PENDING', label: 'Awaiting review' },
  { key: 'APPROVED', label: 'Live' },
  { key: 'REJECTED', label: 'Rejected' },
];

export function AdminCampaignsClient({ initialStatus }: { initialStatus: string }) {
  const [tab, setTab] = useState(TABS.find((t) => t.key === initialStatus)?.key ?? 'PENDING');
  const [items, setItems] = useState<Campaign[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch(`/api/admin/campaigns?status=${tab}`, { cache: 'no-store' });
    const j = await r.json();
    if (j.ok) {
      setItems(j.campaigns);
      const c: Record<string, number> = {};
      for (const row of j.counts) c[row.approvalStatus] = row._count;
      setCounts(c);
    }
  }

  useEffect(() => { load(); setSelected(null); setNote(''); }, [tab]); // eslint-disable-line

  async function act(id: string, action: 'approve' | 'reject') {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/campaigns/${id}/${action}`, {
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
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Campaigns</div>
          <h1 className="mt-2 font-serif text-[32px] sm:text-[40px] leading-[1.02] tracking-[-0.02em]">
            Vendor pitches, <span className="italic text-[color:var(--color-forest)]">curated.</span>
          </h1>
          <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)]">
            Vendors submit promotions — flash sales, festivals, BOGO, late-night deals, tiffin starts. Approve to push to the customer feed.
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
          {items.length === 0 && (
            <li className="rounded-xl border border-dashed border-[color:var(--color-ink)]/15 p-6 text-center text-[13px] text-[color:var(--color-ink-soft)]/70">
              Nothing in this tab.
            </li>
          )}
          {items.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setSelected(c)}
                className={`w-full text-left rounded-2xl border p-4 hover:border-[color:var(--color-forest)]/35 transition-colors ${
                  selected?.id === c.id
                    ? 'border-[color:var(--color-forest)]/45 bg-[color:var(--color-forest)]/5'
                    : 'border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)]'
                }`}
              >
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">
                  {CAMPAIGN_TYPE_LABELS[c.type] ?? c.type}
                </div>
                <div className="mt-1 font-serif text-[18px] leading-tight">{c.title}</div>
                <div className="text-[12px] text-[color:var(--color-ink-soft)] truncate">{c.vendor.name} · {c.vendor.hub}</div>
                <div className="mt-1 text-[11px] text-[color:var(--color-ink-soft)]/65">
                  {fmtDate(c.startsAt)} → {fmtDate(c.endsAt)}
                  {c.discountPct ? ` · ${c.discountPct}% off` : ''}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <aside className="lg:sticky lg:top-[130px] lg:self-start">
        {!selected ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--color-ink)]/15 p-10 text-center text-[13px] text-[color:var(--color-ink-soft)]/70">
            Select a campaign to review.
          </div>
        ) : (
          <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6 space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">{CAMPAIGN_TYPE_LABELS[selected.type] ?? selected.type}</div>
              <h2 className="mt-1 font-serif text-[24px] leading-tight">{selected.title}</h2>
              <p className="text-[12.5px] text-[color:var(--color-ink-soft)]">{selected.vendor.name} · {selected.vendor.hub}</p>
            </div>

            <p className="text-[13.5px] leading-relaxed">{selected.body}</p>

            <div className="grid grid-cols-2 gap-3 text-[12.5px]">
              <KV label="Starts">{fmtDate(selected.startsAt)}</KV>
              <KV label="Ends">{fmtDate(selected.endsAt)}</KV>
              <KV label="CTA">{selected.ctaLabel ?? '—'}</KV>
              <KV label="Discount">{selected.discountPct ? `${selected.discountPct}%` : '—'}</KV>
              <KV label="Items linked">{selected.productIds.length || '—'}</KV>
              <KV label="Vendor turned on">{selected.active ? 'Yes' : 'Paused'}</KV>
            </div>

            {selected.approvalStatus === 'PENDING' ? (
              <>
                <label className="block pt-1">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Note (sent on reject)</span>
                  <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-3 py-2 text-[13.5px] outline-none focus:border-[color:var(--color-forest)]" />
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button disabled={busy} onClick={() => act(selected.id, 'approve')}
                    className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-4 py-2 text-[12.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50">
                    Approve + push live
                  </button>
                  <button disabled={busy} onClick={() => act(selected.id, 'reject')}
                    className="rounded-full border border-[color:var(--color-terracotta)]/40 text-[color:var(--color-terracotta)] px-4 py-2 text-[12.5px] hover:bg-[color:var(--color-terracotta)]/8 disabled:opacity-50">
                    Reject
                  </button>
                </div>
              </>
            ) : selected.approvalNote ? (
              <div className="rounded-xl bg-[color:var(--color-terracotta)]/8 border border-[color:var(--color-terracotta)]/20 px-4 py-3 text-[12.5px]">
                <span className="text-[color:var(--color-ink-soft)]/70">Reviewer note:</span> {selected.approvalNote}
              </div>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/65">{label}</div>
      <div className="text-[13px]">{children}</div>
    </div>
  );
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
