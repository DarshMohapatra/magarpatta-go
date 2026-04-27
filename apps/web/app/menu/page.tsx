import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { NavbarWithSession } from '@/components/navbar-with-session';
import { Footer } from '@/components/footer';
import { CartDrawer } from '@/components/cart-drawer';
import { CampaignBanner } from '@/components/campaign-banner';
import { MenuClient } from './menu-client';
import { applyDiscount, discountFor } from '@/lib/active-discounts';
import { getActiveDiscounts, getAllInStockProducts, getMenuCategories } from '@/lib/menu-cache';
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

  return (
    <main className="relative z-10 min-h-screen">
      <NavbarWithSession />
      <div className="pt-20"><CampaignBanner /></div>
      <Suspense key={`${activeSlug ?? ''}|${q}|${vegOnly}`} fallback={<MenuSkeleton />}>
        <MenuData activeSlug={activeSlug} q={q} vegOnly={vegOnly} />
      </Suspense>
      <Footer />
      <CartDrawer />
    </main>
  );
}

async function MenuData({ activeSlug, q, vegOnly }: { activeSlug: string | null; q: string; vegOnly: boolean }) {
  const isUnfiltered = !activeSlug && !q && !vegOnly;

  // Default unfiltered case is hot — serve from the shared cache. Filter
  // combos vary too much to bother caching, so they hit Prisma directly.
  const productsPromise = isUnfiltered
    ? getAllInStockProducts()
    : prisma.product.findMany({
        where: {
          inStock: true,
          ...(activeSlug ? { category: { slug: activeSlug } } : {}),
          ...(vegOnly ? { isVeg: true } : {}),
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: 'insensitive' as const } },
                  { description: { contains: q, mode: 'insensitive' as const } },
                ],
              }
            : {}),
        },
        orderBy: [{ category: { order: 'asc' } }, { name: 'asc' }],
        include: {
          vendor: { select: { id: true, slug: true, name: true, hub: true } },
          category: { select: { slug: true, name: true } },
        },
      });

  const [categories, products, discounts] = await Promise.all([
    getMenuCategories(),
    productsPromise,
    getActiveDiscounts(),
  ]);

  const productData: ProductCardData[] = products.map((p) => {
    const match = discountFor({ id: p.id, vendorId: p.vendor.id, isRegulated: p.isRegulated }, discounts);
    const priced = applyDiscount({ priceInr: p.priceInr, mrpInr: p.mrpInr, isRegulated: p.isRegulated }, match.pct);
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      priceInr: priced.priceInr,
      mrpInr: priced.mrpInr,
      originalMrpInr: priced.originalMrpInr,
      discountPct: priced.discountPct,
      campaignTitle: match.campaign?.title ?? null,
      campaignType: match.campaign?.type ?? null,
      unit: p.unit,
      isVeg: p.isVeg,
      isRegulated: p.isRegulated,
      accent: p.accent,
      glyph: p.glyph,
      tagline: p.tagline,
      imageUrl: p.imageUrl,
      vendor: { slug: p.vendor.slug, name: p.vendor.name, hub: p.vendor.hub },
    };
  });

  const totalProducts = categories.reduce((sum, c) => sum + c._count.products, 0);

  return (
    <MenuClient
      categories={categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        glyph: c.glyph,
        productCount: c._count.products,
      }))}
      products={productData}
      activeSlug={activeSlug}
      initialQuery={q}
      initialVegOnly={vegOnly}
      totalProducts={totalProducts}
    />
  );
}

function MenuSkeleton() {
  return (
    <section className="pt-24 pb-16">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="h-12 w-72 rounded-md bg-[color:var(--color-ink)]/8 mb-3 animate-pulse" />
        <div className="h-4 w-96 rounded-full bg-[color:var(--color-ink)]/6 mb-10" />
        <div className="grid lg:grid-cols-[220px_1fr] gap-8 lg:gap-10">
          <aside className="hidden lg:block space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 rounded-lg bg-[color:var(--color-ink)]/6 animate-pulse" />
            ))}
          </aside>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-paper)] overflow-hidden">
                <div className="h-44 bg-[color:var(--color-ink)]/6 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-5 w-3/4 rounded-md bg-[color:var(--color-ink)]/8" />
                  <div className="h-3 w-1/2 rounded-full bg-[color:var(--color-ink)]/6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
