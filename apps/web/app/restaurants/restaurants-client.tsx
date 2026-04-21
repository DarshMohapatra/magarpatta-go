'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { openState } from '@/lib/hours';

export interface VendorRow {
  slug: string;
  name: string;
  hub: string;
  description: string | null;
  accent: string;
  vendorType: string;
  tags: string[];
  rating: number | null;
  etaMinutes: number;
  costForTwo: number | null;
  itemCount: number;
  previews: Array<{ id: string; name: string; imageUrl: string | null; accent: string | null; priceInr: number }>;
}

const TYPE_META: Record<string, { label: string; glyph: string }> = {
  restaurant: { label: 'Restaurants', glyph: '🍽' },
  cafe:       { label: 'Cafés',        glyph: '☕' },
  bakery:     { label: 'Bakery',       glyph: '🥐' },
  sweets:     { label: 'Sweets',       glyph: '🍬' },
  grocery:    { label: 'Grocery',      glyph: '🛒' },
  meat:       { label: 'Meat',         glyph: '🥩' },
  pharmacy:   { label: 'Pharmacy',     glyph: '💊' },
};

type SortKey = 'rating' | 'eta' | 'cost';

export function RestaurantsClient({ vendors }: { vendors: VendorRow[] }) {
  const [activeType, setActiveType] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rating');

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const v of vendors) c[v.vendorType] = (c[v.vendorType] ?? 0) + 1;
    return c;
  }, [vendors]);

  const types = useMemo(() => Object.keys(counts).sort(), [counts]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const rows = vendors.filter((v) => {
      if (activeType && v.vendorType !== activeType) return false;
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        v.tags.some((t) => t.toLowerCase().includes(q)) ||
        v.hub.toLowerCase().includes(q)
      );
    });
    const sorted = [...rows];
    if (sortKey === 'rating') {
      sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortKey === 'eta') {
      sorted.sort((a, b) => a.etaMinutes - b.etaMinutes);
    } else if (sortKey === 'cost') {
      sorted.sort((a, b) => (a.costForTwo ?? Number.MAX_SAFE_INTEGER) - (b.costForTwo ?? Number.MAX_SAFE_INTEGER));
    }
    return sorted;
  }, [vendors, activeType, query, sortKey]);

  return (
    <>
      {/* Hero / intro */}
      <section className="pt-24 pb-8">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">
            Partner shops · {vendors.length} live in your postcode
          </div>
          <h1 className="mt-3 font-serif text-[40px] sm:text-[56px] leading-[0.98] tracking-[-0.025em]">
            Restaurants & shops, <span className="italic text-[color:var(--color-forest)]">all in one list.</span>
          </h1>
          <p className="mt-3 text-[14.5px] text-[color:var(--color-ink-soft)] max-w-2xl">
            Pick a shop, open its menu, order what you want. Every item lands in ~25 minutes.
          </p>
        </div>
      </section>

      {/* Sticky filter bar: search + type pills */}
      <div className="sticky top-16 z-30 bg-[color:var(--color-cream)]/85 backdrop-blur-md border-y border-[color:var(--color-ink)]/8">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10 py-3">
          {/* Search */}
          <div className="relative mb-3 max-w-md">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-ink-soft)]/60">
              <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.3" />
              <path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search restaurants, cuisines, shops…"
              className="w-full pl-9 pr-4 py-2.5 rounded-full bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 text-[13.5px] outline-none focus:border-[color:var(--color-forest)] placeholder:text-[color:var(--color-ink-soft)]/50"
            />
          </div>

          {/* Type pills — horizontal scroll on mobile */}
          <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto">
            <div className="flex items-center gap-2 flex-nowrap pb-1">
              <TypePill label="All" count={vendors.length} active={activeType === null} onClick={() => setActiveType(null)} />
              {types.map((t) => (
                <TypePill
                  key={t}
                  label={TYPE_META[t]?.label ?? t}
                  glyph={TYPE_META[t]?.glyph}
                  count={counts[t]}
                  active={activeType === t}
                  onClick={() => setActiveType(t)}
                />
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="mt-3 flex items-center gap-2 text-[12px] text-[color:var(--color-ink-soft)]">
            <span className="uppercase tracking-[0.12em] text-[11px]">Sort</span>
            {([
              { key: 'rating', label: 'Top rated' },
              { key: 'eta',    label: 'Fastest' },
              { key: 'cost',   label: 'Cost (low → high)' },
            ] as const).map((s) => (
              <button
                key={s.key}
                onClick={() => setSortKey(s.key)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[12px] transition-colors',
                  sortKey === s.key
                    ? 'bg-[color:var(--color-ink)] text-[color:var(--color-cream)]'
                    : 'bg-transparent hover:bg-[color:var(--color-ink)]/5',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vendor grid */}
      <section className="pb-24 pt-8">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-10 text-center">
              <p className="font-serif text-[22px]">Nothing matches that.</p>
              <p className="mt-2 text-[13.5px] text-[color:var(--color-ink-soft)]">Clear filters and try a different search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
              {filtered.map((v) => {
                const state = openState(v.vendorType);
                return (
                <Link
                  key={v.slug}
                  href={`/restaurants/${v.slug}`}
                  className="group rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_22px_50px_-24px_rgba(14,17,12,0.25)] transition-all"
                >
                  {/* Closed overlay */}
                  {!state.isOpen && (
                    <div className="absolute top-0 left-0 right-0 z-20 bg-[color:var(--color-ink)]/90 text-[color:var(--color-cream)] text-center text-[11px] uppercase tracking-[0.14em] py-1">
                      Closed · opens {state.opensAt}:00
                    </div>
                  )}

                  {/* Cover: shows product preview images */}
                  <div className={cn("relative h-44 overflow-hidden flex", !state.isOpen && "opacity-60")}>
                    {v.previews.length > 0 ? (
                      v.previews.map((p, i) => (
                        <div key={p.id} className={cn('flex-1 relative', i > 0 && 'border-l border-[color:var(--color-paper)]')}
                          style={{ backgroundColor: `color-mix(in srgb, var(--color-${p.accent ?? 'forest'}) 14%, transparent)` }}
                        >
                          {p.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt={p.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="flex-1 bg-[color:var(--color-cream)]" />
                    )}

                    {/* Top-right type pill */}
                    <div className="absolute top-3 right-3 rounded-full bg-[color:var(--color-paper)]/95 backdrop-blur px-2.5 py-1 text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)] border border-[color:var(--color-ink)]/8">
                      {TYPE_META[v.vendorType]?.glyph ?? ''} {TYPE_META[v.vendorType]?.label ?? v.vendorType}
                    </div>

                    {/* Bottom-left rating chip */}
                    {v.rating && (
                      <div className="absolute bottom-3 left-3 rounded-full bg-[color:var(--color-ink)] text-[color:var(--color-cream)] px-2.5 py-1 text-[11.5px] font-semibold flex items-center gap-1">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M6 1l1.5 3.2 3.5.4-2.6 2.4.7 3.4L6 8.8l-3.1 1.6.7-3.4-2.6-2.4 3.5-.4z" /></svg>
                        {v.rating.toFixed(1)}
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-serif text-[22px] leading-tight text-[color:var(--color-ink)] truncate">
                          {v.name}
                        </h2>
                        <div className="mt-0.5 text-[12.5px] text-[color:var(--color-ink-soft)] truncate">
                          {v.tags.slice(0, 3).join(' · ')}
                        </div>
                      </div>
                    </div>

                    <div className={cn(
                      "mt-2 text-[11.5px]",
                      state.isOpen ? "text-[color:var(--color-forest)]" : "text-[color:var(--color-terracotta-dark)]",
                    )}>
                      {state.label}
                    </div>

                    <div className="mt-3 pt-3 border-t border-[color:var(--color-ink)]/8 flex items-center justify-between text-[12px] text-[color:var(--color-ink-soft)]">
                      <span className="inline-flex items-center gap-1.5">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1" />
                          <path d="M6 3v3l2 1.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                        </svg>
                        {v.etaMinutes} min
                      </span>
                      <span>·</span>
                      <span className="truncate">{v.hub}</span>
                      {v.costForTwo && (
                        <>
                          <span>·</span>
                          <span>₹{v.costForTwo} for two</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function TypePill({ label, count, active, onClick, glyph }: { label: string; count: number; active: boolean; onClick: () => void; glyph?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 shrink-0 px-3.5 py-2 rounded-full text-[13px] whitespace-nowrap transition-all border',
        active
          ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] border-[color:var(--color-forest)]'
          : 'bg-[color:var(--color-paper)] text-[color:var(--color-ink)] border-[color:var(--color-ink)]/10 hover:border-[color:var(--color-forest)]/40',
      )}
    >
      {glyph && <span>{glyph}</span>}
      {label}
      <span className={cn('ml-0.5 text-[10.5px] opacity-75', active && 'opacity-90')}>· {count}</span>
    </button>
  );
}
