'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart';
import { ProductGlyph } from './product-glyph';
import { cn } from '@/lib/utils';

export interface ProductCardData {
  id: string;
  name: string;
  description?: string | null;
  priceInr: number;
  mrpInr?: number | null;
  unit?: string | null;
  isVeg: boolean;
  isRegulated: boolean;
  accent?: string | null;
  glyph?: string | null;
  tagline?: string | null;
  imageUrl?: string | null;
  vendor: { slug: string; name: string; hub: string };
}

const ACCENT_BG: Record<string, string> = {
  saffron: 'bg-[color:var(--color-saffron)]/10',
  forest: 'bg-[color:var(--color-forest)]/8',
  terracotta: 'bg-[color:var(--color-terracotta)]/10',
  sage: 'bg-[color:var(--color-sage)]/12',
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const item = useCart((s) => s.items.find((i) => i.id === product.id));
  const add = useCart((s) => s.add);
  const increment = useCart((s) => s.increment);
  const decrement = useCart((s) => s.decrement);
  const [imgError, setImgError] = useState(false);

  const showImage = product.imageUrl && !imgError;
  // Always show MRP to customer; markup surfaces only as convenience fee at checkout.
  const displayPrice = product.mrpInr ?? product.priceInr;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(15,15,14,0.22)]">
      <div
        className={cn(
          'relative h-44 border-b border-[color:var(--color-ink)]/8 flex items-center justify-center overflow-hidden',
          ACCENT_BG[product.accent ?? 'forest'] ?? ACCENT_BG.forest,
        )}
      >
        {showImage ? (
          // Using plain img to allow onError graceful fallback to the glyph.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl!}
            alt={product.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <ProductGlyph glyph={product.glyph} accent={product.accent} />
        )}

        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {/* veg/non-veg dot */}
          <span
            aria-label={product.isVeg ? 'Vegetarian' : 'Non-vegetarian'}
            className={cn(
              'inline-flex h-4 w-4 items-center justify-center rounded-sm border',
              product.isVeg
                ? 'border-[color:var(--color-forest)]/60'
                : 'border-[color:var(--color-terracotta)]/70',
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                product.isVeg ? 'bg-[color:var(--color-forest)]' : 'bg-[color:var(--color-terracotta)]',
              )}
            />
          </span>
          {product.tagline && (
            <span className="rounded-full bg-[color:var(--color-paper)]/90 backdrop-blur px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]">
              {product.tagline}
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-serif text-[19px] leading-tight text-[color:var(--color-ink)]">
          {product.name}
        </h3>
        <p className="mt-0.5 text-[12px] text-[color:var(--color-ink-soft)]/80 truncate">
          {product.vendor.name}
          {product.unit && <span> · {product.unit}</span>}
        </p>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <span className="font-serif text-[22px] text-[color:var(--color-ink)]">
              ₹{displayPrice}
            </span>
          </div>

          {item ? (
            <div className="inline-flex items-center gap-0 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)]">
              <button
                onClick={() => decrement(product.id)}
                className="h-9 w-9 flex items-center justify-center hover:bg-[color:var(--color-forest-dark)] rounded-l-full"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-6 text-center text-[13px] font-medium">{item.qty}</span>
              <button
                onClick={() => increment(product.id)}
                className="h-9 w-9 flex items-center justify-center hover:bg-[color:var(--color-forest-dark)] rounded-r-full"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() =>
                add({
                  id: product.id,
                  name: product.name,
                  priceInr: product.priceInr,
                  mrpInr: product.mrpInr ?? product.priceInr,
                  isRegulated: product.isRegulated,
                  unit: product.unit,
                  accent: product.accent,
                  glyph: product.glyph,
                  imageUrl: product.imageUrl,
                  vendorName: product.vendor.name,
                })
              }
              className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-forest)] hover:bg-[color:var(--color-forest-dark)] text-[color:var(--color-cream)] px-4 py-2 text-[13px] font-medium transition-colors"
            >
              Add
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
