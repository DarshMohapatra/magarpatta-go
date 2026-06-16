import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { CartDrawer } from '@/components/cart-drawer';
import { ProductCard, type ProductCardData } from '@/components/product-card';
import { HighlightOnMount } from '@/components/highlight-on-mount';
import { MobileShell } from '@/components/customer/mobile-shell';
import { TopBar } from '@/components/customer/top-bar';
import { applyDiscount, discountFor, getActiveDiscounts } from '@/lib/active-discounts';
import { getVendorBySlug, getVendorProducts } from '@/lib/menu-cache';
import { getWholesaleOnlyMode } from '@/lib/settings';
import { getServerLocale } from '@/lib/locale';
import { getServerSession } from '@/lib/session';
import { pickName } from '@/lib/i18n';
import { buildSavingsRows, avgCompetitorPrice, COMPETITOR_SOURCES, type CompetitorPriceLite, type CompetitorSource } from '@/lib/competitor-prices';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function RestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Cheap header query first — the hero paints as soon as this lands; the
  // (slower) menu+discount fetch streams in via Suspense.
  const [vendor, wholesaleOnly] = await Promise.all([
    getVendorBySlug(slug),
    getWholesaleOnlyMode(),
  ]);

  if (!vendor) notFound();

  // In wholesale-only mode, non-wholesale vendor pages should 404 too — the
  // index hides them but a direct URL would still resolve without this check.
  if (wholesaleOnly) {
    const flag = await prisma.vendor.findUnique({ where: { slug }, select: { isWholesale: true } });
    if (!flag?.isWholesale) notFound();
  }

  const session = await getServerSession();

  return (
    <>
      <MobileShell topBar={<TopBar session={session} />}>
        {/* Gradient hero with vendor info */}
        <section className="relative gradient-warm text-white px-4 pt-5 pb-6 overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
          <Link
            href="/restaurants"
            className="relative inline-flex items-center gap-1 text-[12px] font-semibold text-white/90 hover:text-white mb-3"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M10 6H2m0 0l3.5 3.5M2 6l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All vendors
          </Link>
          <div className="relative">
            <div className="text-[10.5px] uppercase tracking-[0.16em] text-white/80 font-semibold">
              {vendor.hub}
            </div>
            <h1 className="mt-1 font-display text-[28px] font-bold leading-tight tracking-tight">
              {vendor.name}
            </h1>
            {vendor.description && (
              <p className="mt-2 text-[13px] leading-snug text-white/85 max-w-md">
                {vendor.description}
              </p>
            )}
            {vendor.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {vendor.tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full bg-white/15 backdrop-blur text-[10.5px] font-semibold text-white">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Rating / ETA / for-two strip — sits below the hero */}
        <section className="px-4 -mt-4">
          <div className="grid grid-cols-3 rounded-[var(--radius-xl)] bg-[color:var(--color-surface)] border border-[color:var(--color-border)]/60 shadow-[var(--shadow-soft)] divide-x divide-[color:var(--color-border)]/40">
            <Stat
              icon={(
                <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor" className="text-[color:var(--color-success)]">
                  <path d="M6 1l1.5 3.2 3.5.4-2.6 2.4.7 3.4L6 8.8l-3.1 1.6.7-3.4-2.6-2.4 3.5-.4z" />
                </svg>
              )}
              value={vendor.rating ? vendor.rating.toFixed(1) : '—'}
              label="Rating"
            />
            <Stat
              icon={(
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              )}
              value={`${vendor.etaMinutes} min`}
              label="Delivery"
            />
            <Stat
              icon={(
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9h18M5 9V6h14v3M5 9v9h14V9" />
                </svg>
              )}
              value={vendor.costForTwo ? `₹${vendor.costForTwo}` : '—'}
              label="For two"
            />
          </div>
        </section>

        <Suspense fallback={<MenuSkeleton />}>
          <VendorMenu vendorId={vendor.id} vendorAccent={vendor.accent} />
        </Suspense>

        <Suspense fallback={null}>
          <HighlightOnMount />
        </Suspense>
      </MobileShell>
      <CartDrawer />
    </>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="py-3 px-2 flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1 text-[14px] font-bold text-[color:var(--color-foreground)] tabular-nums">
        {icon}
        {value}
      </div>
      <div className="text-[9.5px] uppercase tracking-[0.12em] font-semibold text-[color:var(--color-muted)]">
        {label}
      </div>
    </div>
  );
}

async function VendorMenu({ vendorId, vendorAccent }: { vendorId: string; vendorAccent: string | null }) {
  void vendorAccent;
  const [products, discounts, locale] = await Promise.all([
    getVendorProducts(vendorId),
    getActiveDiscounts(),
    getServerLocale(),
  ]);

  // Group by category slug (stable across languages) — display name is
  // pickName()'d at render time so each section header translates with the
  // chosen locale.
  type ProductWithCategory = typeof products[number];
  type CategoryShape = ProductWithCategory['category'];
  const bySlug = new Map<string, { category: CategoryShape; items: ProductWithCategory[] }>();
  for (const p of products) {
    const slug = p.category.slug;
    if (!bySlug.has(slug)) bySlug.set(slug, { category: p.category, items: [] });
    bySlug.get(slug)!.items.push(p);
  }

  // Same one-shot competitor fetch as the /menu page so the rotating
  // savings badge shows on vendor shop pages too.
  const competitorRowsByProduct = new Map<string, CompetitorPriceLite[]>();
  if (products.length > 0) {
    const snapshots = await prisma.competitorPriceSnapshot.findMany({
      where: { productId: { in: products.map((p) => p.id) } },
      select: { productId: true, source: true, priceInr: true, note: true },
    });
    for (const s of snapshots) {
      if (!(COMPETITOR_SOURCES as readonly string[]).includes(s.source)) continue;
      const arr = competitorRowsByProduct.get(s.productId) ?? [];
      arr.push({ source: s.source as CompetitorSource, priceInr: s.priceInr, note: s.note });
      competitorRowsByProduct.set(s.productId, arr);
    }
  }

  return (
    <section className="pt-6 pb-6">
      <div className="px-4">
        {bySlug.size > 1 && (
          <div className="sticky top-0 -mx-4 px-4 py-2 bg-[color:var(--color-background)]/95 backdrop-blur-md border-b border-[color:var(--color-border)]/40 z-10 mb-4">
            <nav className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {[...bySlug.values()].map(({ category, items }) => (
                <a
                  key={category.slug}
                  href={`#${category.slug}`}
                  className="shrink-0 rounded-full bg-[color:var(--color-surface)] border border-[color:var(--color-border)]/60 px-3 py-1 text-[12px] font-semibold text-[color:var(--color-foreground)] hover:border-[color:var(--color-primary)]/40"
                >
                  {pickName(category, locale)}
                  <span className="ml-1 text-[10.5px] text-[color:var(--color-muted)]">({items.length})</span>
                </a>
              ))}
            </nav>
          </div>
        )}

        <div className="space-y-8">
          {[...bySlug.values()].map(({ category, items }) => (
            <section key={category.slug} id={category.slug} className="scroll-mt-24">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-display text-[19px] font-bold tracking-tight text-[color:var(--color-foreground)]">
                  {pickName(category, locale)}
                </h2>
                <span className="text-[11px] font-semibold text-[color:var(--color-muted)]">
                  {items.length} item{items.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {items.map((p) => {
                  const match = discountFor({ id: p.id, vendorId: p.vendor.id, isRegulated: p.isRegulated, priceInr: p.priceInr, mrpInr: p.mrpInr }, discounts);
                  const priced = applyDiscount({ priceInr: p.priceInr, mrpInr: p.mrpInr, isRegulated: p.isRegulated }, match.saving, match.campaign);
                  const data: ProductCardData = {
                    id: p.id,
                    name: p.name,
                    nameHi: p.nameHi,
                    nameMr: p.nameMr,
                    description: p.description,
                    priceInr: priced.priceInr,
                    mrpInr: priced.mrpInr,
                    originalMrpInr: priced.originalMrpInr,
                    discountPct: priced.discountPct,
                    discountFlatInr: priced.discountFlatInr,
                    campaignTitle: match.campaign?.title ?? null,
                    campaignType: match.campaign?.type ?? null,
                    unit: p.unit,
                    isVeg: p.isVeg,
                    isRegulated: p.isRegulated,
                    soldByWeight: p.soldByWeight,
                    estimatedGrams: p.estimatedGrams,
                    accent: p.accent,
                    glyph: p.glyph,
                    tagline: p.tagline,
                    imageUrl: p.imageUrl,
                    vendor: { slug: p.vendor.slug, name: p.vendor.name, hub: p.vendor.hub },
                    savingsRows: buildSavingsRows(priced.mrpInr ?? priced.priceInr, competitorRowsByProduct.get(p.id) ?? []),
                    competitorAvgInr: avgCompetitorPrice(competitorRowsByProduct.get(p.id) ?? []),
                  };
                  return (
                    <div key={p.id} id={`product-${p.id}`} className="rounded-2xl scroll-mt-32">
                      <ProductCard product={data} locale={locale} />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

function MenuSkeleton() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <div className="h-7 w-40 rounded-md bg-[color:var(--color-ink)]/8 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-paper)] overflow-hidden">
              <div className="h-44 bg-[color:var(--color-ink)]/6 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-5 w-3/4 rounded-md bg-[color:var(--color-ink)]/8" />
                <div className="h-3 w-1/2 rounded-full bg-[color:var(--color-ink)]/6" />
                <div className="mt-3 flex items-center justify-between">
                  <div className="h-6 w-16 rounded-md bg-[color:var(--color-ink)]/8" />
                  <div className="h-9 w-20 rounded-full bg-[color:var(--color-ink)]/8" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
