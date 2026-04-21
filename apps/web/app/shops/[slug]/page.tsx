import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { NavbarWithSession } from '@/components/navbar-with-session';
import { Footer } from '@/components/footer';
import { CartDrawer } from '@/components/cart-drawer';
import { ProductCard, type ProductCardData } from '@/components/product-card';

export const dynamic = 'force-dynamic';

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vendor = await prisma.vendor.findUnique({
    where: { slug },
    include: {
      products: {
        where: { inStock: true },
        orderBy: [{ category: { order: 'asc' } }, { name: 'asc' }],
        include: {
          category: { select: { name: true, slug: true } },
          vendor: { select: { slug: true, name: true, hub: true } },
        },
      },
    },
  });

  if (!vendor) notFound();

  // Group by category
  const byCategory = new Map<string, typeof vendor.products>();
  for (const p of vendor.products) {
    const key = p.category.name;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(p);
  }

  const accentBg: Record<string, string> = {
    saffron: 'from-[color:var(--color-saffron)]/20 to-[color:var(--color-saffron)]/5',
    forest: 'from-[color:var(--color-forest)]/15 to-[color:var(--color-forest)]/5',
    terracotta: 'from-[color:var(--color-terracotta)]/18 to-[color:var(--color-terracotta)]/5',
  };

  return (
    <main className="relative z-10 min-h-screen">
      <NavbarWithSession />

      {/* Shop header */}
      <section className={`pt-24 pb-10 bg-gradient-to-br ${accentBg[vendor.accent ?? 'forest'] ?? accentBg.forest} border-b border-[color:var(--color-ink)]/8`}>
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <Link href="/shops" className="inline-flex items-center gap-1.5 text-[12.5px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)] mb-6">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M10 6H2m0 0l3.5 3.5M2 6l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All shops
          </Link>

          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-ink-soft)]/75">
            {vendor.hub}
          </div>
          <h1 className="mt-3 font-serif text-[44px] sm:text-[64px] leading-[0.98] tracking-[-0.025em]">
            {vendor.name}
          </h1>
          {vendor.description && (
            <p className="mt-4 max-w-2xl text-[15px] leading-[1.55] text-[color:var(--color-ink-soft)]">
              {vendor.description}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4 text-[12.5px] text-[color:var(--color-ink-soft)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-forest)]" />
              Open · ~25 min delivery
            </span>
            <span>·</span>
            <span>{vendor.products.length} items in stock</span>
            <span>·</span>
            <span>{byCategory.size} {byCategory.size === 1 ? 'category' : 'categories'}</span>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10 space-y-10">
          {[...byCategory.entries()].map(([catName, products]) => (
            <div key={catName}>
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-serif text-[28px] sm:text-[32px] leading-tight">{catName}</h2>
                <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/65">
                  {products.length} item{products.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
                {products.map((p) => {
                  const data: ProductCardData = {
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    priceInr: p.priceInr,
                    mrpInr: p.mrpInr,
                    unit: p.unit,
                    isVeg: p.isVeg,
                    isRegulated: p.isRegulated,
                    accent: p.accent,
                    glyph: p.glyph,
                    tagline: p.tagline,
                    imageUrl: p.imageUrl,
                    vendor: p.vendor,
                  };
                  return <ProductCard key={p.id} product={data} />;
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
      <CartDrawer />
    </main>
  );
}
