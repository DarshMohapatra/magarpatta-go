'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ProductCard, type ProductCardData } from '@/components/product-card';
import { cn } from '@/lib/utils';

interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  glyph: string | null;
  productCount: number;
}

interface Props {
  categories: CategoryItem[];
  products: ProductCardData[];
  activeSlug: string | null;
  initialQuery: string;
  initialVegOnly: boolean;
  totalProducts: number;
}

export function MenuClient({
  categories,
  products,
  activeSlug,
  initialQuery,
  initialVegOnly,
  totalProducts,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [vegOnly, setVegOnly] = useState(initialVegOnly);
  const [isPending, startTransition] = useTransition();

  function updateQuery(patch: { cat?: string | null; q?: string; veg?: boolean }) {
    const params = new URLSearchParams();
    const cat = patch.cat === undefined ? activeSlug : patch.cat;
    if (cat) params.set('cat', cat);
    const query = patch.q !== undefined ? patch.q : q;
    if (query) params.set('q', query);
    const veg = patch.veg !== undefined ? patch.veg : vegOnly;
    if (veg) params.set('veg', '1');
    const qs = params.toString();
    startTransition(() => {
      router.push(`/menu${qs ? `?${qs}` : ''}`);
    });
  }

  const activeCategory = categories.find((c) => c.slug === activeSlug);

  return (
    <section className="pt-24 pb-16">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">
              Hyper-local catalog · {totalProducts} items live
            </div>
            <h1 className="mt-3 font-serif text-[44px] lg:text-[56px] leading-[0.98] tracking-[-0.02em]">
              {activeCategory ? (
                <>
                  {activeCategory.name.split(' ')[0]}{' '}
                  <span className="italic text-[color:var(--color-forest)]">
                    {activeCategory.name.split(' ').slice(1).join(' ') || 'only'}
                  </span>
                </>
              ) : (
                <>
                  Everything Magarpatta{' '}
                  <span className="italic text-[color:var(--color-forest)]">already stocks.</span>
                </>
              )}
            </h1>
            <p className="mt-3 text-[14.5px] text-[color:var(--color-ink-soft)] max-w-xl">
              Sourced from nine partner shops inside or adjacent to Magarpatta.{' '}
              <a href="/restaurants" className="text-[color:var(--color-forest)] underline underline-offset-4 hover:text-[color:var(--color-forest-dark)]">
                Browse by restaurant & shop →
              </a>
            </p>
          </div>
        </div>

        {/* Filters strip */}
        <div className="sticky top-16 z-30 -mx-6 lg:-mx-10 px-6 lg:px-10 py-4 bg-[color:var(--color-cream)]/85 backdrop-blur-md border-y border-[color:var(--color-ink)]/8 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-ink-soft)]/60">
              <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.3" />
              <path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateQuery({ q });
              }}
              placeholder="Search jalebi, paracetamol, mangoes…"
              className="w-full pl-9 pr-4 py-2.5 rounded-full bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 text-[13.5px] outline-none focus:border-[color:var(--color-forest)] placeholder:text-[color:var(--color-ink-soft)]/50"
            />
          </div>

          <button
            onClick={() => {
              setVegOnly(!vegOnly);
              updateQuery({ veg: !vegOnly });
            }}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] border transition-colors',
              vegOnly
                ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] border-[color:var(--color-forest)]'
                : 'bg-[color:var(--color-paper)] text-[color:var(--color-ink)] border-[color:var(--color-ink)]/10 hover:border-[color:var(--color-forest)]/40',
            )}
          >
            <span
              className={cn(
                'inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border',
                vegOnly ? 'border-[color:var(--color-cream)]' : 'border-[color:var(--color-forest)]/60',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', vegOnly ? 'bg-[color:var(--color-cream)]' : 'bg-[color:var(--color-forest)]')} />
            </span>
            Veg only
          </button>

          {isPending && (
            <span className="text-[11.5px] text-[color:var(--color-ink-soft)]/70">Loading…</span>
          )}
        </div>

        {/* Layout: sidebar + grid */}
        <div className="mt-8 grid lg:grid-cols-[220px_1fr] gap-8 lg:gap-10">
          {/* Category sidebar */}
          <aside className="lg:sticky lg:top-36 lg:self-start">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-ink-soft)]/70 mb-3">
              Categories
            </div>
            <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible -mx-6 px-6 lg:mx-0 lg:px-0 pb-2 lg:pb-0">
              <button
                onClick={() => updateQuery({ cat: null })}
                className={cn(
                  'shrink-0 lg:shrink px-3.5 py-2 rounded-full lg:rounded-lg text-left text-[13.5px] whitespace-nowrap lg:whitespace-normal transition-colors',
                  !activeSlug
                    ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)]'
                    : 'hover:bg-[color:var(--color-ink)]/5 text-[color:var(--color-ink)]',
                )}
              >
                <span className="flex items-center justify-between gap-3">
                  All items
                  <span className="text-[11px] opacity-70">{totalProducts}</span>
                </span>
              </button>
              {categories.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => updateQuery({ cat: c.slug })}
                  className={cn(
                    'shrink-0 lg:shrink px-3.5 py-2 rounded-full lg:rounded-lg text-left text-[13.5px] whitespace-nowrap lg:whitespace-normal transition-colors',
                    activeSlug === c.slug
                      ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)]'
                      : 'hover:bg-[color:var(--color-ink)]/5 text-[color:var(--color-ink)]',
                  )}
                >
                  <span className="flex items-center justify-between gap-3">
                    {c.name}
                    <span className="text-[11px] opacity-70">{c.productCount}</span>
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Product grid */}
          <div>
            {products.length === 0 ? (
              <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-10 text-center">
                <p className="font-serif text-[24px] leading-tight">
                  Nothing matches <span className="italic">&ldquo;{q || activeCategory?.name}&rdquo;</span>.
                </p>
                <p className="mt-2 text-[13.5px] text-[color:var(--color-ink-soft)]">
                  Clear filters or try a different search.
                </p>
                <button
                  onClick={() => {
                    setQ('');
                    setVegOnly(false);
                    updateQuery({ cat: null, q: '', veg: false });
                  }}
                  className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)]"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
