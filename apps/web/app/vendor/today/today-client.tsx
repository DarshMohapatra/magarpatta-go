'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface DailyRow {
  productId: string;
  name: string;
  unit: string | null;
  category: string;
  masterPriceInr: number;
  masterMrpInr: number | null;
  masterInStock: boolean;
  todayOverride: {
    priceInr: number | null;
    mrpInr: number | null;
    inStock: boolean | null;
    note: string | null;
    updatedAt: string;
  } | null;
  priorOverride: {
    priceInr: number | null;
    mrpInr: number | null;
    inStock: boolean | null;
    forDate: string;
  } | null;
  effective: { priceInr: number; mrpInr: number; inStock: boolean };
}

interface Draft {
  priceInr: string;
  mrpInr: string;
  inStock: boolean;
  saving: boolean;
  error?: string;
  savedAt?: number;
}

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function draftFromRow(r: DailyRow): Draft {
  return {
    priceInr: String(r.todayOverride?.priceInr ?? ''),
    mrpInr: String(r.todayOverride?.mrpInr ?? ''),
    inStock: r.todayOverride?.inStock ?? r.effective.inStock,
    saving: false,
  };
}

export function TodayClient() {
  const [rows, setRows] = useState<DailyRow[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [topError, setTopError] = useState<string | null>(null);
  const today = useMemo(isoToday, []);

  const load = useCallback(async () => {
    setLoading(true);
    setTopError(null);
    try {
      const res = await fetch(`/api/vendor/daily?date=${today}`);
      const data = await res.json();
      if (!data.ok) {
        setTopError(data.error ?? 'Failed to load');
        return;
      }
      setRows(data.rows);
      const next: Record<string, Draft> = {};
      for (const r of data.rows as DailyRow[]) next[r.productId] = draftFromRow(r);
      setDrafts(next);
    } catch {
      setTopError('Network error');
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  function patchDraft(productId: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [productId]: { ...prev[productId], ...patch } }));
  }

  async function save(productId: string) {
    const d = drafts[productId];
    if (!d) return;
    patchDraft(productId, { saving: true, error: undefined });
    try {
      const body: Record<string, unknown> = { productId, date: today };
      body.priceInr = d.priceInr === '' ? null : Number(d.priceInr);
      body.mrpInr = d.mrpInr === '' ? null : Number(d.mrpInr);
      body.inStock = d.inStock;
      const res = await fetch('/api/vendor/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) {
        patchDraft(productId, { saving: false, error: data.error ?? 'Failed' });
        return;
      }
      patchDraft(productId, { saving: false, savedAt: Date.now() });
      load();
    } catch {
      patchDraft(productId, { saving: false, error: 'Network error' });
    }
  }

  async function clearToday(productId: string) {
    if (!confirm('Clear today\'s override? The item will fall back to the most recent prior day or master fields.')) return;
    patchDraft(productId, { saving: true });
    try {
      const res = await fetch('/api/vendor/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, date: today, clear: true }),
      });
      const data = await res.json();
      if (!data.ok) {
        patchDraft(productId, { saving: false, error: data.error ?? 'Failed' });
        return;
      }
      load();
    } catch {
      patchDraft(productId, { saving: false, error: 'Network error' });
    }
  }

  if (loading && rows === null) {
    return <p className="mt-10 text-[14px] text-[color:var(--color-ink-soft)]">Loading menu…</p>;
  }

  if (!rows || rows.length === 0) {
    return (
      <p className="mt-10 text-[14px] text-[color:var(--color-ink-soft)] italic">
        You haven't added any products yet. Add some in the Menu tab first.
      </p>
    );
  }

  return (
    <div className="mt-10 space-y-3">
      {topError && (
        <div className="rounded-lg border border-[color:var(--color-terracotta)]/30 bg-[color:var(--color-terracotta)]/5 px-4 py-3 text-[13px] text-[color:var(--color-terracotta)]">
          {topError}
        </div>
      )}

      {rows.map((r) => {
        const d = drafts[r.productId];
        if (!d) return null;
        const hasOverride = Boolean(r.todayOverride);
        const recentlySaved = d.savedAt && Date.now() - d.savedAt < 4000;
        return (
          <div
            key={r.productId}
            className="grid grid-cols-12 items-center gap-3 rounded-xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] px-4 py-3"
          >
            <div className="col-span-4">
              <div className="font-medium text-[14.5px]">{r.name}</div>
              <div className="text-[11px] text-[color:var(--color-ink-soft)]">
                {r.category}{r.unit ? ` · ${r.unit}` : ''} · master ₹{r.masterPriceInr}
                {r.priorOverride && (
                  <> · yesterday ₹{r.priorOverride.priceInr ?? r.masterPriceInr}</>
                )}
              </div>
            </div>

            <div className="col-span-2 flex items-center gap-1">
              <span className="text-[11px] text-[color:var(--color-ink-soft)]">price</span>
              <input
                type="number"
                value={d.priceInr}
                onChange={(e) => patchDraft(r.productId, { priceInr: e.target.value })}
                placeholder={String(r.effective.priceInr)}
                min={0}
                className="w-20 rounded border border-[color:var(--color-ink)]/15 px-2 py-1 text-[13px] outline-none focus:border-[color:var(--color-forest)]"
              />
            </div>

            <div className="col-span-2 flex items-center gap-1">
              <span className="text-[11px] text-[color:var(--color-ink-soft)]">MRP</span>
              <input
                type="number"
                value={d.mrpInr}
                onChange={(e) => patchDraft(r.productId, { mrpInr: e.target.value })}
                placeholder={String(r.effective.mrpInr)}
                min={0}
                className="w-20 rounded border border-[color:var(--color-ink)]/15 px-2 py-1 text-[13px] outline-none focus:border-[color:var(--color-forest)]"
              />
            </div>

            <label className="col-span-2 inline-flex items-center gap-2 text-[12.5px]">
              <input
                type="checkbox"
                checked={d.inStock}
                onChange={(e) => patchDraft(r.productId, { inStock: e.target.checked })}
              />
              In stock
            </label>

            <div className="col-span-2 flex items-center justify-end gap-2">
              {d.error && <span className="text-[11px] text-[color:var(--color-terracotta)]">{d.error}</span>}
              {recentlySaved && !d.error && (
                <span className="text-[11px] text-[color:var(--color-forest)]">Saved</span>
              )}
              <button
                onClick={() => save(r.productId)}
                disabled={d.saving}
                className="rounded-md bg-[color:var(--color-forest)] text-white px-3 py-1.5 text-[12px] disabled:opacity-50 hover:opacity-90"
              >
                {d.saving ? '…' : 'Save'}
              </button>
              {hasOverride && (
                <button
                  onClick={() => clearToday(r.productId)}
                  disabled={d.saving}
                  className="text-[11px] text-[color:var(--color-terracotta)] hover:underline"
                  title="Remove today's override and fall back to yesterday's"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
