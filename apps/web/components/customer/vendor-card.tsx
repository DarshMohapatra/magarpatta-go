import Link from 'next/link';

export interface VendorCardData {
  slug: string;
  name: string;
  /** Optional cuisine / category description below the name. */
  description?: string | null;
  rating?: number | null;
  /** Optional ratings-count (e.g. 1.2k) shown beside the rating chip. */
  ratingCount?: number | null;
  etaMinutes: number;
  /** Delivery fee in rupees. Hidden when 0 (member free delivery). */
  deliveryFeeInr?: number | null;
  /** Distance from customer in km. Optional — hidden when not known. */
  distanceKm?: number | null;
  /** Indicative cost for two in rupees — shown as "₹X for two". */
  costForTwo?: number | null;
  hub: string;
  /** When true, renders the "Closed" overlay + dims the card. */
  closed?: boolean;
  /** Pill row above the name — "New", "Bestseller", "Free delivery". */
  tags?: string[];
}

/**
 * Vendor card with two variants:
 *   - 'wide'  — full-width row in the home / search vendor list
 *   - 'rail'  — narrower fixed-width card for horizontal "Near you" rails
 *
 * Hero uses the brand gradient (.gradient-warm) instead of vendor imagery
 * until we have CDN photos. Replace the gradient div with <Image> once
 * imagery lands.
 */
export function VendorCard({
  vendor,
  variant = 'wide',
}: {
  vendor: VendorCardData;
  variant?: 'wide' | 'rail';
}) {
  const widthCls = variant === 'rail' ? 'min-w-[240px] max-w-[240px]' : 'w-full';
  const heroHeight = variant === 'rail' ? 'h-28' : 'h-32 sm:h-36';

  return (
    <Link
      href={`/restaurants/${vendor.slug}`}
      className={
        widthCls +
        ' group relative block rounded-[var(--radius-xl)] bg-[color:var(--color-surface)] border border-[color:var(--color-border)]/60 overflow-hidden shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elev)] transition-shadow' +
        (vendor.closed ? ' opacity-70' : '')
      }
    >
      <div className={`relative ${heroHeight} gradient-warm overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        {vendor.rating && (
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-[color:var(--color-success)] text-white px-2 py-0.5 text-[11px] font-semibold shadow-[var(--shadow-soft)]">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 1l1.5 3.2 3.5.4-2.6 2.4.7 3.4L6 8.8l-3.1 1.6.7-3.4-2.6-2.4 3.5-.4z" />
            </svg>
            {vendor.rating.toFixed(1)}
          </div>
        )}
        {vendor.closed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <span className="px-3 py-1 rounded-full bg-white text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-foreground)]">
              Currently closed
            </span>
          </div>
        )}
        {vendor.tags && vendor.tags.length > 0 && (
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
            {vendor.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="rounded-full bg-white/90 backdrop-blur px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[color:var(--color-foreground)]"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-[14px] leading-tight tracking-tight text-[color:var(--color-foreground)] truncate flex-1">
            {vendor.name}
          </h3>
          {vendor.rating != null && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[color:var(--color-foreground)] shrink-0">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" className="text-[color:var(--color-saffron)]">
                <path d="M6 1l1.5 3.2 3.5.4-2.6 2.4.7 3.4L6 8.8l-3.1 1.6.7-3.4-2.6-2.4 3.5-.4z" />
              </svg>
              {vendor.rating.toFixed(1)}
              {vendor.ratingCount != null && (
                <span className="font-normal text-[10px] text-[color:var(--color-muted)]">
                  ({formatCount(vendor.ratingCount)})
                </span>
              )}
            </span>
          )}
        </div>
        {vendor.description && (
          <p className="mt-0.5 text-[11.5px] text-[color:var(--color-muted)] truncate">{vendor.description}</p>
        )}
        <div className="mt-2 flex items-center gap-2 text-[11px] text-[color:var(--color-muted)] tabular-nums">
          <span className="inline-flex items-center gap-0.5">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="6" cy="6" r="4.5" />
              <path d="M6 3.5V6L7.5 7.5" strokeLinecap="round" />
            </svg>
            {vendor.etaMinutes} min
          </span>
          {vendor.costForTwo != null && (
            <>
              <span className="opacity-70">·</span>
              <span>₹{vendor.costForTwo} for two</span>
            </>
          )}
          {vendor.deliveryFeeInr != null && (
            <>
              <span className="opacity-70">·</span>
              <span>{vendor.deliveryFeeInr === 0 ? 'Free delivery' : `₹${vendor.deliveryFeeInr} fee`}</span>
            </>
          )}
          {vendor.distanceKm != null && (
            <>
              <span className="opacity-70">·</span>
              <span>{vendor.distanceKm.toFixed(1)} km</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}
