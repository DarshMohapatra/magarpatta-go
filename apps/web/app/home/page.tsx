import Link from 'next/link';
import { getServerSession } from '@/lib/session';
import { siteConfig } from '@/lib/site-config';
import { getMenuCategories, getRestaurantIndex } from '@/lib/menu-cache';
import { getWholesaleOnlyMode } from '@/lib/settings';
import { getServerLocale } from '@/lib/locale';
import { pickName } from '@/lib/i18n';
import { MobileShell } from '@/components/customer/mobile-shell';
import { TopBar } from '@/components/customer/top-bar';
import { VendorCard, type VendorCardData } from '@/components/customer/vendor-card';
import { CartDrawer } from '@/components/cart-drawer';

/**
 * Redesigned customer home — discovery surface signed-in users land on.
 * Sections in order: search CTA → promo banner → category grid →
 * "Near you" horizontal vendor rail → full vendor list. Floating cart pill
 * sits above the bottom nav.
 *
 * Layout is mobile-first (max-w-md). Desktop centres the same column.
 */
export const metadata = {
  title: `${siteConfig.platformName} — Home`,
  description: `Fresh produce, daily essentials, and meals delivered within ${siteConfig.siteName}.`,
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [session, locale, categories, vendorsRaw, wholesaleOnly] = await Promise.all([
    getServerSession(),
    getServerLocale(),
    getMenuCategories(),
    getRestaurantIndex(),
    getWholesaleOnlyMode(),
  ]);

  // Phase-1 launch is wholesale-produce-only. When the wholesale_only_mode
  // setting is on (which it is for Magarpatta), only show vendors flagged
  // isWholesale=true. Honors the same filter the /menu page applies so the
  // discovery surface stays in sync with the catalog whitelist.
  const vendors = wholesaleOnly ? vendorsRaw.filter((v) => v.isWholesale) : vendorsRaw;

  const liveVendors = vendors.slice(0, 8).map<VendorCardData>((v) => ({
    slug: v.slug,
    name: v.name,
    description: v.description ?? v.tags?.[0] ?? v.vendorType,
    rating: v.rating,
    etaMinutes: v.etaMinutes,
    deliveryFeeInr: v.isWholesale ? 0 : 15,
    distanceKm: 1.4,
    hub: v.hub,
    tags: v.isWholesale ? ['Free delivery'] : v.rating && v.rating > 4.6 ? ['Bestseller'] : [],
  }));
  const railVendors = liveVendors.slice(0, 5);

  return (
    <>
      <MobileShell topBar={<TopBar session={session} />}>
        {/* Search CTA — feels like a search bar, routes to /menu */}
        <section className="px-4 pt-4">
          <Link
            href="/menu"
            className="flex items-center gap-3 rounded-[var(--radius-xl)] bg-[color:var(--color-surface)] border border-[color:var(--color-border)]/60 px-4 py-3 shadow-[var(--shadow-soft)] active:scale-[0.99] transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="text-[color:var(--color-muted)]">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <span className="flex-1 text-[14px] text-[color:var(--color-muted)] truncate">
              Search vendors, fruits, dal, anything…
            </span>
            <span className="rounded-full bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)] text-[10px] uppercase tracking-[0.12em] font-semibold px-2 py-0.5">
              Veg
            </span>
          </Link>
        </section>

        {/* Promo banner — gradient + glow */}
        <section className="px-4 pt-4">
          <div className="relative overflow-hidden rounded-[var(--radius-2xl)] gradient-warm text-white p-5 shadow-[var(--shadow-glow)]">
            <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
            <div className="relative">
              <div className="text-[10px] uppercase tracking-[0.18em] font-semibold opacity-90">
                Weekend offer · ends Sunday
              </div>
              <h2 className="mt-2 text-[22px] leading-tight font-bold tracking-tight">
                Free delivery on orders over ₹199
              </h2>
              <p className="mt-1 text-[12.5px] opacity-90">
                Use code <span className="font-semibold">FRESH</span> at checkout.
              </p>
              <Link
                href="/menu"
                className="mt-4 inline-flex items-center gap-1 rounded-full bg-white text-[color:var(--color-primary)] px-4 py-1.5 text-[12.5px] font-semibold shadow-[var(--shadow-soft)] active:scale-[0.98] transition-transform"
              >
                Start shopping
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* Category grid */}
        <section className="px-4 pt-6">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-[17px] font-bold tracking-tight">Browse categories</h2>
            <Link href="/menu" className="text-[12px] text-[color:var(--color-primary)] font-semibold">
              See all
            </Link>
          </div>
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-2.5 lg:gap-4">
            {categories.slice(0, 8).map((c) => (
              <Link
                key={c.slug}
                href={`/menu?cat=${c.slug}`}
                className="rounded-[var(--radius-lg)] bg-[color:var(--color-surface)] border border-[color:var(--color-border)]/60 p-3 flex flex-col items-center gap-1.5 shadow-[var(--shadow-soft)] active:scale-[0.97] transition-transform"
              >
                <span className="text-2xl" aria-hidden>{glyphEmoji(c.glyph)}</span>
                <span className="text-[10.5px] font-semibold text-center leading-tight tracking-tight text-[color:var(--color-foreground)]">
                  {pickName(c, locale)}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Near-you rail */}
        {railVendors.length > 0 && (
          <section className="pt-6">
            <div className="px-4 flex items-baseline justify-between mb-3">
              <h2 className="font-display text-[17px] font-bold tracking-tight">Near you</h2>
              <Link href="/restaurants" className="text-[12px] text-[color:var(--color-primary)] font-semibold">
                See all
              </Link>
            </div>
            <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-1">
              {railVendors.map((v) => (
                <VendorCard key={v.slug} vendor={v} variant="rail" />
              ))}
            </div>
          </section>
        )}

        {/* Full vendor list */}
        <section className="px-4 pt-6">
          <h2 className="font-display text-[17px] lg:text-[22px] font-bold tracking-tight mb-3">
            All vendors in {siteConfig.siteName}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-5">
            {liveVendors.map((v) => (
              <VendorCard key={v.slug} vendor={v} variant="wide" />
            ))}
          </div>
        </section>

        {/* Footer note */}
        <section className="px-4 pt-8 text-center">
          <p className="text-[11px] text-[color:var(--color-muted)] leading-relaxed">
            Hyper-local delivery inside {siteConfig.siteName}. By neighbours, for neighbours.
          </p>
        </section>
      </MobileShell>

      <CartDrawer />
    </>
  );
}

/** Quick mapping of category glyph keys to emoji equivalents, matching
 *  Lovable's emoji-based category tile aesthetic. Falls back to a basket. */
function glyphEmoji(glyph: string | null): string {
  switch (glyph) {
    case 'leaf': return '🥬';
    case 'sweet': return '🍬';
    case 'drop': return '🥛';
    case 'grain': return '🌾';
    case 'loaf': return '🍞';
    case 'cut': return '🥩';
    case 'pill': return '💊';
    case 'cup': return '☕';
    case 'box':
    default: return '🧺';
  }
}
