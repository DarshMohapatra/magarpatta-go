'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, type CartProduct } from '@/lib/cart';
import { ProductGlyph } from './product-glyph';
import { VendorSwitchDialog } from './vendor-switch-dialog';
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
  /** Pre-discount MRP, only set when a campaign discount is live on this item. */
  originalMrpInr?: number | null;
  /** Active campaign discount percentage; 0 if none. */
  discountPct?: number;
  /** Active campaign flat discount in ₹; null if none. */
  discountFlatInr?: number | null;
  /** Active campaign title — shown in the cart as a coupon-style line. */
  campaignTitle?: string | null;
  /** Active campaign type (e.g. WEEKEND, FLASH_SALE) — used for the cart label. */
  campaignType?: string | null;
  /** ISO timestamp of the latest vendor daily-override on this product
   *  (only set when it was edited today). Used to render the "Updated X
   *  mins ago" freshness badge. */
  priceUpdatedAt?: string | null;
}

function relativeMinutes(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  return `${hours} hour${hours === 1 ? '' : 's'} ago`;
}

const ACCENT_BG: Record<string, string> = {
  saffron: 'bg-[color:var(--color-saffron)]/10',
  forest: 'bg-[color:var(--color-forest)]/8',
  terracotta: 'bg-[color:var(--color-terracotta)]/10',
  sage: 'bg-[color:var(--color-sage)]/12',
};

export function ProductCard({
  product,
  viewShopOnAdd = false,
}: {
  product: ProductCardData;
  /**
   * When true (search/menu page), tapping the card body navigates to the
   * vendor's shop page with this item highlighted, and "Add" both adds the
   * item to the cart AND navigates to the shop so the user can keep ordering
   * other things from the same vendor.
   */
  viewShopOnAdd?: boolean;
}) {
  const router = useRouter();
  const item = useCart((s) => s.items.find((i) => i.id === product.id));
  const add = useCart((s) => s.add);
  const replaceCartWith = useCart((s) => s.replaceCartWith);
  const increment = useCart((s) => s.increment);
  const decrement = useCart((s) => s.decrement);
  const [imgError, setImgError] = useState(false);
  const [conflict, setConflict] = useState<{ currentHub: string; nextHub: string; currentVendorName: string; nextVendorName: string } | null>(null);

  const cartProduct: CartProduct = {
    id: product.id,
    name: product.name,
    priceInr: product.priceInr,
    mrpInr: product.mrpInr ?? product.priceInr,
    isRegulated: product.isRegulated,
    unit: product.unit,
    accent: product.accent,
    glyph: product.glyph,
    imageUrl: product.imageUrl,
    vendorSlug: product.vendor.slug,
    vendorName: product.vendor.name,
    vendorHub: product.vendor.hub,
    originalMrpInr: product.originalMrpInr ?? null,
    campaignTitle: product.campaignTitle ?? null,
    campaignType: product.campaignType ?? null,
  };

  function gotoShop() {
    router.push(`/restaurants/${product.vendor.slug}?highlight=${product.id}`);
  }

  function handleAdd() {
    const result = add(cartProduct);
    if (!result.ok) {
      setConflict(result.conflict);
      return;
    }
    if (viewShopOnAdd) gotoShop();
  }

  // Card-body click in search context: navigate to the shop with this item
  // pre-highlighted, without adding. Lets users browse the rest of the menu
  // before committing. Action buttons (Add / +/-) stop propagation themselves.
  function handleCardClick(e: React.MouseEvent<HTMLElement>) {
    if (!viewShopOnAdd) return;
    if ((e.target as HTMLElement).closest('button')) return;
    gotoShop();
  }

  const showImage = product.imageUrl && !imgError;
  const hasPctDiscount = (product.discountPct ?? 0) > 0;
  const hasFlatDiscount = (product.discountFlatInr ?? 0) > 0;
  const onSale = (hasPctDiscount || hasFlatDiscount) && product.originalMrpInr != null;
  const saleBadge = hasPctDiscount
    ? `${product.discountPct}% off`
    : hasFlatDiscount
      ? `₹${product.discountFlatInr} off`
      : null;
  // Always show MRP to customer; markup surfaces only as convenience fee at checkout.
  // When a campaign discount is live, the MRP shown is already discounted,
  // and the original MRP is rendered crossed-out alongside.
  const displayPrice = product.mrpInr ?? product.priceInr;

  return (
    <article
      onClick={handleCardClick}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(15,15,14,0.22)]',
        viewShopOnAdd && 'cursor-pointer',
      )}
    >
      <div
        className={cn(
          // Compact image strip: shorter on phones, full height from sm up so
          // 2-per-row mobile grid + 3/4-per-row desktop grid both look tight.
          'relative aspect-square sm:h-40 sm:aspect-auto border-b border-[color:var(--color-ink)]/8 flex items-center justify-center overflow-hidden',
          ACCENT_BG[product.accent ?? 'forest'] ?? ACCENT_BG.forest,
        )}
      >
        {showImage ? (
          // Using plain img to allow onError graceful fallback to the glyph.
          // object-contain (not -cover) so wholesale produce photos — many
          // shot portrait against a white background — show the whole
          // product instead of a tightly-cropped detail. The accent-tinted
          // tile sits behind, framing the image cleanly.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl!}
            alt={product.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-contain p-3 group-hover:scale-[1.03] transition-transform duration-500"
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
          {product.priceUpdatedAt && (
            <span className="rounded-full bg-[color:var(--color-forest)]/12 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-forest)] font-medium">
              Updated {relativeMinutes(product.priceUpdatedAt)}
            </span>
          )}
        </div>

        {onSale && saleBadge && (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-[color:var(--color-terracotta)] text-[color:var(--color-cream)] px-2.5 py-0.5 text-[10.5px] uppercase tracking-[0.12em] font-medium shadow-[0_4px_14px_-6px_rgba(15,15,14,0.4)]">
            {saleBadge}
          </span>
        )}
      </div>

      <div className="p-2.5 sm:p-4">
        <h3 className="font-serif text-[15px] sm:text-[18px] leading-tight text-[color:var(--color-ink)] line-clamp-2">
          {product.name}
        </h3>
        <p className="mt-0.5 text-[11px] sm:text-[12px] text-[color:var(--color-ink-soft)]/80 truncate">
          {product.unit ?? product.vendor.name}
        </p>

        <div className="mt-2 sm:mt-3 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className={cn('font-serif text-[17px] sm:text-[20px]', onSale ? 'text-[color:var(--color-terracotta)]' : 'text-[color:var(--color-ink)]')}>
              ₹{displayPrice}
            </span>
            {onSale && (
              <span className="text-[11px] text-[color:var(--color-ink-soft)]/55 line-through">
                ₹{product.originalMrpInr}
              </span>
            )}
          </div>

          {item ? (
            <div className="inline-flex items-center rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] shrink-0">
              <button
                onClick={() => decrement(product.id)}
                className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center hover:bg-[color:var(--color-forest-dark)] rounded-l-full"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-5 sm:w-6 text-center text-[12.5px] font-medium">{item.qty}</span>
              <button
                onClick={() => increment(product.id)}
                className="h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center hover:bg-[color:var(--color-forest-dark)] rounded-r-full"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-forest)] hover:bg-[color:var(--color-forest-dark)] text-[color:var(--color-cream)] px-3 sm:px-4 py-1.5 sm:py-2 text-[12px] sm:text-[13px] font-medium transition-colors shrink-0"
            >
              Add
            </button>
          )}
        </div>
      </div>

      {conflict && (
        <VendorSwitchDialog
          currentHub={conflict.currentHub}
          nextHub={conflict.nextHub}
          currentVendorName={conflict.currentVendorName}
          nextVendorName={conflict.nextVendorName}
          onCancel={() => setConflict(null)}
          onConfirm={() => {
            replaceCartWith(cartProduct);
            setConflict(null);
            if (viewShopOnAdd) gotoShop();
          }}
        />
      )}
    </article>
  );
}
