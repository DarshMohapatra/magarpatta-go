'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProductCard, type ProductCardData } from '@/components/product-card';
import { pickName, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  nameHi: string | null;
  nameMr: string | null;
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
  locale: Locale;
}

/**
 * Search / catalog client. Mobile-first single column per Lovable spec.
 * Prominent search → horizontal category chips → veg toggle → product
 * grid. Server data (filtered by category/query) arrives as props.
 */
export function MenuClient({
  categories,
  products,
  activeSlug,
  initialQuery,
  initialVegOnly,
  totalProducts,
  locale,
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

  // Live search — debounce 300 ms after the user stops typing so we don't
  // fire a router.push on every keystroke. Lovable parity: results update
  // as you type, no Enter required.
  const lastDispatched = useRef(initialQuery);
  useEffect(() => {
    if (q === lastDispatched.current) return;
    const t = setTimeout(() => {
      lastDispatched.current = q;
      updateQuery({ q });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const activeCategory = categories.find((c) => c.slug === activeSlug);
  const activeCategoryName = activeCategory ? pickName(activeCategory, locale) : null;

  return (
    <div className="font-display">
      {/* Search bar — prominent, Lovable's signature layout */}
      <section className="px-4 pt-4">
        <div className="relative">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)]">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') updateQuery({ q }); }}
            placeholder="Search vendors, fruits, dal, anything…"
            className="w-full pl-11 pr-4 py-3 rounded-[var(--radius-xl)] bg-[color:var(--color-surface)] border border-[color:var(--color-border)]/60 shadow-[var(--shadow-soft)] text-[14px] text-[color:var(--color-foreground)] placeholder:text-[color:var(--color-muted)] outline-none focus:border-[color:var(--color-primary)] transition-colors"
          />
        </div>
      </section>

      {/* Category chips (horizontal scroll) */}
      <section className="pt-4">
        <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide pb-1">
          <CategoryChip
            label="All"
            count={totalProducts}
            active={!activeSlug}
            onClick={() => updateQuery({ cat: null })}
          />
          {categories.map((c) => (
            <CategoryChip
              key={c.slug}
              label={pickName(c, locale)}
              count={c.productCount}
              active={activeSlug === c.slug}
              onClick={() => updateQuery({ cat: c.slug })}
            />
          ))}
        </div>
      </section>

      {/* Veg toggle row */}
      <section className="px-4 pt-3 flex items-center justify-between">
        <button
          onClick={() => { setVegOnly(!vegOnly); updateQuery({ veg: !vegOnly }); }}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] transition-colors',
            vegOnly
              ? 'bg-[color:var(--color-success)] text-white border-[color:var(--color-success)]'
              : 'bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] border-[color:var(--color-border)]/60 hover:border-[color:var(--color-success)]/40',
          )}
        >
          <span className={cn(
            'inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border',
            vegOnly ? 'border-white' : 'border-[color:var(--color-success)]/60',
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', vegOnly ? 'bg-white' : 'bg-[color:var(--color-success)]')} />
          </span>
          Veg only
        </button>
        {isPending && (
          <span className="text-[11px] text-[color:var(--color-muted)]">Loading…</span>
        )}
      </section>

      {/* Heading */}
      <section className="px-4 pt-4">
        <h1 className="font-display text-[22px] font-bold tracking-tight text-[color:var(--color-foreground)]">
          {activeCategoryName ? activeCategoryName : 'Search the catalog'}
          <span className="ml-2 text-[12px] font-medium text-[color:var(--color-muted)]">
            {products.length} {products.length === 1 ? 'item' : 'items'}
          </span>
        </h1>
        {!activeCategoryName && (
          <p className="mt-1 text-[12.5px] text-[color:var(--color-muted)]">
            Prefer browsing a shop?{' '}
            <Link href="/restaurants" className="text-[color:var(--color-primary)] font-semibold">
              See all vendors
            </Link>
          </p>
        )}
      </section>

      {/* Product grid */}
      <section className="px-4 pt-4">
        {products.length === 0 ? (
          <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)]/60 bg-[color:var(--color-surface)] p-8 text-center">
            <p className="text-[16px] font-semibold leading-tight text-[color:var(--color-foreground)]">
              Nothing matches &ldquo;{q || activeCategoryName}&rdquo;.
            </p>
            <p className="mt-2 text-[12.5px] text-[color:var(--color-muted)]">
              Clear filters or try a different search.
            </p>
            <button
              onClick={() => {
                setQ('');
                setVegOnly(false);
                updateQuery({ cat: null, q: '', veg: false });
              }}
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] hover:opacity-90"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} viewShopOnAdd locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold border transition-colors',
        active
          ? 'bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] border-[color:var(--color-primary)]'
          : 'bg-[color:var(--color-surface)] text-[color:var(--color-foreground)] border-[color:var(--color-border)]/60 hover:border-[color:var(--color-primary)]/40',
      )}
    >
      {label}
      <span className={cn('text-[10.5px] opacity-70', active && 'opacity-90')}>{count}</span>
    </button>
  );
}
