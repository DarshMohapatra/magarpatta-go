'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CompetitorSource } from '@/lib/competitor-prices';

export interface ProductRow {
  id: string;
  name: string;
  ourPriceInr: number;
  unit: string;
  vendorName: string;
  categoryName: string;
  priceBySource: Partial<Record<CompetitorSource, number>>;
  latestCapturedAt: string | null;
}

interface Draft {
  prices: Partial<Record<CompetitorSource, string>>;
  saving: boolean;
  savedAt: number | null;
  err: string | null;
}

export function CompetitorPricesClient({
  rows,
  canEdit,
  sources,
  scopedCategorySlugs,
}: {
  rows: ProductRow[];
  canEdit: boolean;
  sources: readonly CompetitorSource[];
  scopedCategorySlugs: string[];
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const out: Record<string, Draft> = {};
    for (const r of rows) {
      const prices: Partial<Record<CompetitorSource, string>> = {};
      for (const s of sources) {
        prices[s] = r.priceBySource[s] ? String(r.priceBySource[s]) : '';
      }
      out[r.id] = { prices, saving: false, savedAt: null, err: null };
    }
    return out;
  });
  const [search, setSearch] = useState('');
  const [seedRunning, setSeedRunning] = useState(false);
  const [seedReport, setSeedReport] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? rows.filter((r) => `${r.name} ${r.vendorName} ${r.categoryName}`.toLowerCase().includes(q))
      : rows;
  }, [rows, search]);

  async function save(id: string) {
    const d = drafts[id];
    if (!d || !canEdit) return;
    setDrafts((s) => ({ ...s, [id]: { ...s[id], saving: true, err: null } }));
    const body = {
      prices: Object.fromEntries(
        sources.map((src) => {
          const raw = d.prices[src];
          if (raw == null || raw === '') return [src, null];
          const n = Number(raw);
          return [src, Number.isFinite(n) && n > 0 ? n : null];
        }),
      ),
    };
    try {
      const r = await fetch(`/api/admin/competitor-prices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.ok) {
        setDrafts((s) => ({ ...s, [id]: { ...s[id], saving: false, err: j.error ?? 'Save failed' } }));
        return;
      }
      setDrafts((s) => ({ ...s, [id]: { ...s[id], saving: false, savedAt: Date.now(), err: null } }));
    } catch (e) {
      setDrafts((s) => ({ ...s, [id]: { ...s[id], saving: false, err: (e as Error).message } }));
    }
  }

  async function runSeed() {
    if (!canEdit) return;
    setSeedRunning(true);
    setSeedReport(null);
    try {
      const r = await fetch('/api/admin/competitor-prices/seed', { method: 'POST' });
      const j = await r.json();
      if (!j.ok) { setSeedReport(j.error ?? 'Seed failed'); return; }
      setSeedReport(`Wrote ${j.upserted} rows across ${j.productsMatched} products.`);
      router.refresh();
    } catch (e) {
      setSeedReport((e as Error).message);
    } finally {
      setSeedRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Competitor prices</div>
          <h1 className="mt-2 font-serif text-[32px] sm:text-[40px] leading-[1.02] tracking-[-0.02em]">
            How we stack up <span className="italic text-[color:var(--color-forest)]">vs the quick-commerce field.</span>
          </h1>
          <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)] max-w-[680px]">
            One row per product, one column per competitor. Customers see a small &quot;vs Blinkit, save X%&quot; badge on each card that cycles through whichever sources we&apos;re cheaper than. Sources we&apos;re NOT cheaper than are skipped silently.
          </p>
          {scopedCategorySlugs.length > 0 && (
            <p className="mt-1 text-[11.5px] text-[color:var(--color-saffron)]">
              Scoped to live categories: <strong>{scopedCategorySlugs.join(', ')}</strong>.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <button
            onClick={runSeed}
            disabled={seedRunning || !canEdit}
            className="rounded-md bg-[color:var(--color-saffron)] text-[color:var(--color-ink)] px-4 py-2 text-[13px] font-medium disabled:opacity-50 hover:brightness-95"
          >
            {seedRunning ? 'Seeding…' : 'Load from agent seed'}
          </button>
          {seedReport && (
            <p className="text-[11.5px] text-[color:var(--color-forest)] max-w-[280px]">{seedReport}</p>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="rounded-xl bg-[color:var(--color-saffron)]/12 border border-[color:var(--color-saffron)]/30 px-4 py-3 text-[12.5px]">
          You can read prices here but only SUPER_ADMIN or OPS roles can edit.
        </div>
      )}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, vendor, category"
        className="w-full max-w-md rounded-full border border-[color:var(--color-ink)]/15 bg-[color:var(--color-paper)] px-4 py-1.5 text-[12.5px]"
      />

      <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-[12.5px]">
            <thead className="bg-[color:var(--color-cream)]/60">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium uppercase tracking-[0.1em] text-[10.5px] text-[color:var(--color-ink-soft)]">Product</th>
                <th className="px-3 py-2 font-medium uppercase tracking-[0.1em] text-[10.5px] text-[color:var(--color-ink-soft)] text-right">Our ₹</th>
                {sources.map((s) => (
                  <th key={s} className="px-3 py-2 font-medium uppercase tracking-[0.1em] text-[10.5px] text-[color:var(--color-ink-soft)] text-right">{s}</th>
                ))}
                <th className="px-3 py-2 font-medium uppercase tracking-[0.1em] text-[10.5px] text-[color:var(--color-ink-soft)]">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--color-ink)]/8">
              {filtered.map((r) => {
                const d = drafts[r.id]!;
                const stateLabel = d.saving ? 'Saving…' : d.err ? d.err : d.savedAt ? '✓ saved' : '';
                const stateClass = d.err ? 'text-[color:var(--color-terracotta)]' : 'text-[color:var(--color-forest)]';
                return (
                  <tr key={r.id} className="align-middle">
                    <td className="px-3 py-2">
                      <div className="font-medium text-[13px]">{r.name}</div>
                      <div className="text-[10.5px] text-[color:var(--color-ink-soft)]/70">{r.unit} · {r.vendorName}</div>
                    </td>
                    <td className="px-3 py-2 text-right text-[13px] font-medium">₹{r.ourPriceInr}</td>
                    {sources.map((s) => (
                      <td key={s} className="px-2 py-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={d.prices[s] ?? ''}
                          disabled={!canEdit}
                          placeholder="—"
                          onChange={(e) => setDrafts((st) => ({
                            ...st,
                            [r.id]: { ...st[r.id], prices: { ...st[r.id].prices, [s]: e.target.value } },
                          }))}
                          onBlur={() => save(r.id)}
                          className="w-20 text-right rounded-md border border-[color:var(--color-ink)]/10 px-2 py-1 disabled:bg-[color:var(--color-cream)]/40"
                        />
                      </td>
                    ))}
                    <td className={`px-3 py-2 text-[11px] whitespace-nowrap ${stateClass}`}>{stateLabel}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={2 + sources.length + 1} className="px-3 py-12 text-center text-[12.5px] text-[color:var(--color-ink-soft)]/70">
                    No products match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
