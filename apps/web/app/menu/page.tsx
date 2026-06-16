import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { CartDrawer } from '@/components/cart-drawer';
import { CampaignBanner } from '@/components/campaign-banner';
import { MobileShell } from '@/components/customer/mobile-shell';
import { TopBar } from '@/components/customer/top-bar';
import { getServerSession } from '@/lib/session';
import { MenuClient } from './menu-client';
import { applyDiscount, discountFor } from '@/lib/active-discounts';
import { getActiveDiscounts, getAllInStockProducts, getMenuCategories } from '@/lib/menu-cache';
import { resolveAvailability } from '@/lib/product-availability';
import { getWholesaleOnlyMode } from '@/lib/settings';
import { getServerLocale } from '@/lib/locale';
import { buildSavingsRows, avgCompetitorPrice, COMPETITOR_SOURCES, type CompetitorPriceLite, type CompetitorSource } from '@/lib/competitor-prices';
import { ensureCompetitorPricesSeeded } from '@/lib/competitor-seed';
import type { ProductCardData } from '@/components/product-card';

export const dynamic = 'force-dynamic';

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string; veg?: string }>;
}) {
  const params = await searchParams;
  const activeSlug = params.cat ?? null;
  const q = params.q ?? '';
  const vegOnly = params.veg === '1';

  const session = await getServerSession();
  return (
    <>
      <MobileShell topBar={<TopBar session={session} />}>
        <CampaignBanner />
        <Suspense key={`${activeSlug ?? ''}|${q}|${vegOnly}`} fallback={<MenuSkeleton />}>
          <MenuData activeSlug={activeSlug} q={q} vegOnly={vegOnly} />
        </Suspense>
      </MobileShell>
      <CartDrawer />
    </>
  );
}

async function MenuData({ activeSlug, q, vegOnly }: { activeSlug: string | null; q: string; vegOnly: boolean }) {
  const isUnfiltered = !activeSlug && !q && !vegOnly;

  // Default unfiltered case is hot — serve from the shared cache. Filter
  // combos vary too much to bother caching, so they hit Prisma directly.
  // We pull either masters-in-stock OR products with a daily override so
  // the override resolver can flip an OOS item back on for today.
  const productsPromise = isUnfiltered
    ? getAllInStockProducts()
    : prisma.product.findMany({
        where: {
          OR: [
            { inStock: true },
            { dailyOverrides: { some: {} } },
          ],
          ...(activeSlug ? { category: { slug: activeSlug } } : {}),
          ...(vegOnly ? { isVeg: true } : {}),
          ...(q
            ? {
                AND: [
                  {
                    OR: [
                      { name: { contains: q, mode: 'insensitive' as const } },
                      { description: { contains: q, mode: 'insensitive' as const } },
                    ],
                  },
                ],
              }
            : {}),
        },
        orderBy: [{ category: { order: 'asc' } }, { name: 'asc' }],
        include: {
          vendor: { select: { id: true, slug: true, name: true, hub: true, isWholesale: true } },
          category: { select: { slug: true, name: true } },
        },
      });

  const [categories, productsRaw, discounts, wholesaleOnly, locale] = await Promise.all([
    getMenuCategories(),
    productsPromise,
    getActiveDiscounts(),
    getWholesaleOnlyMode(),
    getServerLocale(),
  ]);

  const wholesaleScoped = wholesaleOnly
    ? productsRaw.filter((p) => p.vendor.isWholesale)
    : productsRaw;

  const availability = await resolveAvailability(
    wholesaleScoped.map((p) => ({ id: p.id, priceInr: p.priceInr, mrpInr: p.mrpInr, inStock: p.inStock })),
  );

  const visibleProducts = wholesaleScoped.filter((p) => availability.get(p.id)?.inStock ?? p.inStock);

  // Auto-seed competitor snapshots if the DB is empty (first deploy /
  // freshly-pushed schema). Idempotent — once seeded, this is a single
  // cheap COUNT query. Means we never ship a launch with an empty
  // comparison table just because admin forgot to click the button.
  await ensureCompetitorPricesSeeded();

  // Batch-fetch competitor snapshots for every visible product in ONE query
  // and group by productId. Cheaper than threading the relation through the
  // menu cache, and the hover badge only needs the price + source.
  const competitorRowsByProduct = new Map<string, CompetitorPriceLite[]>();
  if (visibleProducts.length > 0) {
    const snapshots = await prisma.competitorPriceSnapshot.findMany({
      where: { productId: { in: visibleProducts.map((p) => p.id) } },
      select: { productId: true, source: true, priceInr: true, note: true },
    });
    for (const s of snapshots) {
      if (!(COMPETITOR_SOURCES as readonly string[]).includes(s.source)) continue;
      const arr = competitorRowsByProduct.get(s.productId) ?? [];
      arr.push({ source: s.source as CompetitorSource, priceInr: s.priceInr, note: s.note });
      competitorRowsByProduct.set(s.productId, arr);
    }
  }

  const productData: ProductCardData[] = visibleProducts.map((p) => {
    const eff = availability.get(p.id)!;
    const match = discountFor({ id: p.id, vendorId: p.vendor.id, isRegulated: p.isRegulated, priceInr: eff.priceInr, mrpInr: eff.mrpInr }, discounts);
    const priced = applyDiscount({ priceInr: eff.priceInr, mrpInr: eff.mrpInr, isRegulated: p.isRegulated }, match.saving, match.campaign);
    return {
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
      priceUpdatedAt: eff.sourceLabel === 'today' && eff.updatedAt ? eff.updatedAt.toISOString() : null,
      savingsRows: buildSavingsRows(priced.mrpInr ?? priced.priceInr, competitorRowsByProduct.get(p.id) ?? []),
      competitorAvgInr: avgCompetitorPrice(competitorRowsByProduct.get(p.id) ?? []),
    };
  });

  // Compute live per-category counts from the filtered product set instead
  // of the cached _count (which counts every product regardless of wholesale
  // mode). Categories with zero in-scope products drop out entirely so the
  // sidebar doesn't show empty cuisines in wholesale-only mode.
  // Reference vs slug: catalog API embeds slug+name on each row; we group
  // by slug to compute per-category totals here.
  // Note: we fetch products via the cached / inline query that JOINs to a
  // category select { slug, name }. visibleProducts.map((p) => p.category.slug).
  const countsBySlug = new Map<string, number>();
  for (const p of visibleProducts) {
    const slug = (p as { category?: { slug?: string } }).category?.slug;
    if (!slug) continue;
    countsBySlug.set(slug, (countsBySlug.get(slug) ?? 0) + 1);
  }
  const liveCategories = categories
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      nameHi: c.nameHi,
      nameMr: c.nameMr,
      glyph: c.glyph,
      productCount: countsBySlug.get(c.slug) ?? 0,
    }))
    .filter((c) => c.productCount > 0);

  const totalProducts = visibleProducts.length;

  return (
    <MenuClient
      categories={liveCategories}
      products={productData}
      activeSlug={activeSlug}
      initialQuery={q}
      initialVegOnly={vegOnly}
      totalProducts={totalProducts}
      locale={locale}
    />
  );
}

function MenuSkeleton() {
  return (
    <section className="pt-24 pb-16">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="h-12 w-72 rounded-md bg-[color:var(--color-foreground)]/8 mb-3 animate-pulse" />
        <div className="h-4 w-96 rounded-full bg-[color:var(--color-foreground)]/6 mb-10" />
        <div className="grid lg:grid-cols-[220px_1fr] gap-8 lg:gap-10">
          <aside className="hidden lg:block space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 rounded-lg bg-[color:var(--color-foreground)]/6 animate-pulse" />
            ))}
          </aside>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-2xl border border-[color:var(--color-foreground)]/8 bg-[color:var(--color-surface)] overflow-hidden">
                <div className="h-44 bg-[color:var(--color-foreground)]/6 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-5 w-3/4 rounded-md bg-[color:var(--color-foreground)]/8" />
                  <div className="h-3 w-1/2 rounded-full bg-[color:var(--color-foreground)]/6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
