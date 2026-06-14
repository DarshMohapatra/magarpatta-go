'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface ProductRow {
  id: string;
  name: string;
  nameHi: string | null;
  nameMr: string | null;
  nameSourceLang: string;
  vendorName: string;
  categoryName: string;
}

interface Draft {
  name: string;
  nameHi: string;
  nameMr: string;
  saving: boolean;
  savedAt: number | null;
  err: string | null;
}

export function TranslationsClient({ rows, canEdit }: { rows: ProductRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const out: Record<string, Draft> = {};
    for (const r of rows) {
      out[r.id] = { name: r.name, nameHi: r.nameHi ?? '', nameMr: r.nameMr ?? '', saving: false, savedAt: null, err: null };
    }
    return out;
  });
  const [filter, setFilter] = useState<'all' | 'missing'>('missing');
  const [search, setSearch] = useState('');
  const [seedRunning, setSeedRunning] = useState(false);
  const [seedReport, setSeedReport] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const d = drafts[r.id];
      // "Missing" hides rows whose both translation columns are populated.
      // Useful for powering through the gap list — once a row is complete,
      // it falls off the visible list on next page load.
      if (filter === 'missing' && d?.nameHi && d?.nameMr) return false;
      if (q && !(`${r.name} ${r.vendorName} ${r.categoryName}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, drafts, filter, search]);

  async function save(id: string) {
    const d = drafts[id];
    if (!d || !canEdit) return;
    setDrafts((s) => ({ ...s, [id]: { ...s[id], saving: true, err: null } }));
    try {
      const r = await fetch(`/api/admin/translations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: d.name, nameHi: d.nameHi, nameMr: d.nameMr }),
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
      const r = await fetch('/api/admin/translations/seed', { method: 'POST' });
      const j = await r.json();
      if (!j.ok) {
        setSeedReport(j.error ?? 'Seed failed');
        return;
      }
      setSeedReport(`Filled ${j.updated} of ${j.dictionarySize} dictionary entries.`);
      // Refresh server data so the new translations appear in the rows.
      router.refresh();
    } catch (e) {
      setSeedReport((e as Error).message);
    } finally {
      setSeedRunning(false);
    }
  }

  const missingCount = rows.filter((r) => {
    const d = drafts[r.id];
    return !d?.nameHi || !d?.nameMr;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Catalog translations</div>
          <h1 className="mt-2 font-serif text-[32px] sm:text-[40px] leading-[1.02] tracking-[-0.02em]">
            हिंदी &amp; <span className="italic text-[color:var(--color-forest)]">मराठी</span> for the menu.
          </h1>
          <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)] max-w-[640px]">
            Every product needs all three names so the customer language toggle works. Edits autosave as you click out of each input.
          </p>
          <p className="mt-1 text-[12px] text-[color:var(--color-ink-soft)]/75">
            <strong>{missingCount}</strong> of {rows.length} products still missing a Hindi or Marathi translation.
          </p>
        </div>
        <div className="space-y-2">
          <button
            onClick={runSeed}
            disabled={seedRunning || !canEdit}
            className="rounded-md bg-[color:var(--color-saffron)] text-[color:var(--color-ink)] px-4 py-2 text-[13px] font-medium disabled:opacity-50 hover:brightness-95"
          >
            {seedRunning ? 'Applying…' : 'Apply seed translations'}
          </button>
          {seedReport && (
            <p className="text-[11.5px] text-[color:var(--color-forest)] max-w-[280px]">{seedReport}</p>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="rounded-xl bg-[color:var(--color-saffron)]/12 border border-[color:var(--color-saffron)]/30 px-4 py-3 text-[12.5px]">
          You can read translations here but only SUPER_ADMIN or OPS roles can edit.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-[color:var(--color-ink)]/15 overflow-hidden">
          <button
            onClick={() => setFilter('missing')}
            className={`px-3 py-1.5 text-[12px] ${filter === 'missing' ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)]' : 'text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-ink)]/5'}`}
          >
            Missing only ({missingCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-[12px] ${filter === 'all' ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)]' : 'text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-ink)]/5'}`}
          >
            All ({rows.length})
          </button>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, vendor, category"
          className="flex-1 min-w-[240px] max-w-md rounded-full border border-[color:var(--color-ink)]/15 bg-[color:var(--color-paper)] px-4 py-1.5 text-[12.5px]"
        />
      </div>

      <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-[12.5px]">
            <thead className="bg-[color:var(--color-cream)]/60">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium uppercase tracking-[0.1em] text-[10.5px] text-[color:var(--color-ink-soft)]">English</th>
                <th className="px-3 py-2 font-medium uppercase tracking-[0.1em] text-[10.5px] text-[color:var(--color-ink-soft)]">हिंदी</th>
                <th className="px-3 py-2 font-medium uppercase tracking-[0.1em] text-[10.5px] text-[color:var(--color-ink-soft)]">मराठी</th>
                <th className="px-3 py-2 font-medium uppercase tracking-[0.1em] text-[10.5px] text-[color:var(--color-ink-soft)]">Vendor · Category</th>
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
                      <input
                        type="text"
                        value={d.name}
                        disabled={!canEdit}
                        onChange={(e) => setDrafts((s) => ({ ...s, [r.id]: { ...s[r.id], name: e.target.value } }))}
                        onBlur={() => save(r.id)}
                        className="w-full rounded-md border border-[color:var(--color-ink)]/10 px-2 py-1.5 disabled:bg-[color:var(--color-cream)]/40"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={d.nameHi}
                        disabled={!canEdit}
                        placeholder="जैसे — टमाटर"
                        onChange={(e) => setDrafts((s) => ({ ...s, [r.id]: { ...s[r.id], nameHi: e.target.value } }))}
                        onBlur={() => save(r.id)}
                        className="w-full rounded-md border border-[color:var(--color-ink)]/10 px-2 py-1.5 disabled:bg-[color:var(--color-cream)]/40"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={d.nameMr}
                        disabled={!canEdit}
                        placeholder="उदा. — टोमॅटो"
                        onChange={(e) => setDrafts((s) => ({ ...s, [r.id]: { ...s[r.id], nameMr: e.target.value } }))}
                        onBlur={() => save(r.id)}
                        className="w-full rounded-md border border-[color:var(--color-ink)]/10 px-2 py-1.5 disabled:bg-[color:var(--color-cream)]/40"
                      />
                    </td>
                    <td className="px-3 py-2 text-[11.5px] text-[color:var(--color-ink-soft)]/85 whitespace-nowrap">
                      {r.vendorName} · {r.categoryName}
                    </td>
                    <td className={`px-3 py-2 text-[11px] whitespace-nowrap ${stateClass}`}>{stateLabel}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-[12.5px] text-[color:var(--color-ink-soft)]/70">
                    {filter === 'missing'
                      ? 'Every visible product has both translations filled. Switch to "All" to see the complete list.'
                      : 'No products match your search.'}
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
