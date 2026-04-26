import { prisma } from '@/lib/prisma';
import { NavbarWithSession } from '@/components/navbar-with-session';
import { Footer } from '@/components/footer';
import { CartDrawer } from '@/components/cart-drawer';
import { CampaignBanner } from '@/components/campaign-banner';
import { MenuClient } from './menu-client';
import { applyDiscount, discountFor, getActiveDiscounts } from '@/lib/active-discounts';
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

  const [categories, products, discounts] = await Promise.all([
    prisma.category.findMany({
      orderBy: { order: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        glyph: true,
        _count: { select: { products: { where: { inStock: true } } } },
      },
    }),
    prisma.product.findMany({
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
    }),
    getActiveDiscounts(),
  ]);

  const productData: ProductCardData[] = products.map((p) => {
    const pct = discountFor({ id: p.id, vendorId: p.vendor.id, isRegulated: p.isRegulated }, discounts);
    const priced = applyDiscount({ priceInr: p.priceInr, mrpInr: p.mrpInr, isRegulated: p.isRegulated }, pct);
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      priceInr: priced.priceInr,
      mrpInr: priced.mrpInr,
      originalMrpInr: priced.originalMrpInr,
      discountPct: priced.discountPct,
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
    <main className="relative z-10 min-h-screen">
      <NavbarWithSession />
      <div className="pt-20"><CampaignBanner /></div>
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
      <Footer />
      <CartDrawer />
    </main>
  );
}
