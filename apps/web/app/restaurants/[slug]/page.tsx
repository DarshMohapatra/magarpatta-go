import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { NavbarWithSession } from '@/components/navbar-with-session';
import { Footer } from '@/components/footer';
import { CartDrawer } from '@/components/cart-drawer';
import { ProductCard, type ProductCardData } from '@/components/product-card';
import { applyDiscount, discountFor, getActiveDiscounts } from '@/lib/active-discounts';
import { getVendorBySlug, getVendorProducts } from '@/lib/menu-cache';

export const dynamic = 'force-dynamic';

const ACCENT_GRAD: Record<string, string> = {
  saffron:    'from-[color:var(--color-saffron)]/20 to-[color:var(--color-saffron)]/4',
  forest:     'from-[color:var(--color-forest)]/18 to-[color:var(--color-forest)]/4',
  terracotta: 'from-[color:var(--color-terracotta)]/18 to-[color:var(--color-terracotta)]/4',
};

export default async function RestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Cheap header query first — the hero paints as soon as this lands; the
  // (slower) menu+discount fetch streams in via Suspense.
  const vendor = await getVendorBySlug(slug);

  if (!vendor) notFound();

  return (
    <main className="relative z-10 min-h-screen">
      <NavbarWithSession />

      <section className={`pt-24 pb-10 bg-gradient-to-br ${ACCENT_GRAD[vendor.accent ?? 'forest'] ?? ACCENT_GRAD.forest} border-b border-[color:var(--color-ink)]/8`}>
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <Link href="/restaurants" className="inline-flex items-center gap-1.5 text-[12.5px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)] mb-6">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M10 6H2m0 0l3.5 3.5M2 6l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All restaurants & shops
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-ink-soft)]/75">
                {vendor.hub}
              </div>
              <h1 className="mt-2 font-serif text-[40px] sm:text-[56px] leading-[0.96] tracking-[-0.025em]">
                {vendor.name}
              </h1>
              {vendor.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {vendor.tags.map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-full bg-[color:var(--color-paper)]/80 border border-[color:var(--color-ink)]/10 text-[11px] text-[color:var(--color-ink-soft)]">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {vendor.description && (
                <p className="mt-4 max-w-2xl text-[14.5px] leading-[1.55] text-[color:var(--color-ink-soft)]">
                  {vendor.description}
                </p>
              )}
            </div>

            <div className="flex sm:flex-col gap-3 sm:gap-4 sm:text-right">
              {vendor.rating && (
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[color:var(--color-forest)] text-[color:var(--color-cream)] text-[14px] font-semibold">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 1l1.5 3.2 3.5.4-2.6 2.4.7 3.4L6 8.8l-3.1 1.6.7-3.4-2.6-2.4 3.5-.4z" /></svg>
                    {vendor.rating.toFixed(1)}
                  </div>
                  <div className="mt-1 text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/65">Rating</div>
                </div>
              )}
              <div>
                <div className="font-serif text-[22px] text-[color:var(--color-ink)]">{vendor.etaMinutes} min</div>
                <div className="mt-1 text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/65">Delivery</div>
              </div>
              {vendor.costForTwo && (
                <div>
                  <div className="font-serif text-[22px] text-[color:var(--color-ink)]">₹{vendor.costForTwo}</div>
                  <div className="mt-1 text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/65">For two</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Suspense fallback={<MenuSkeleton />}>
        <VendorMenu vendorId={vendor.id} vendorAccent={vendor.accent} />
      </Suspense>

      <Footer />
      <CartDrawer />
    </main>
  );
}

async function VendorMenu({ vendorId, vendorAccent }: { vendorId: string; vendorAccent: string | null }) {
  void vendorAccent;
  const [products, discounts] = await Promise.all([
    getVendorProducts(vendorId),
    getActiveDiscounts(),
  ]);

  const byCategory = new Map<string, typeof products>();
  for (const p of products) {
    const key = p.category.name;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(p);
  }

  return (
    <section className="py-12">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
        {byCategory.size > 1 && (
          <div className="hidden lg:block sticky top-16 bg-[color:var(--color-cream)]/85 backdrop-blur-md -mx-10 px-10 py-3 border-y border-[color:var(--color-ink)]/8 z-20 mb-8">
            <nav className="flex items-center gap-5 overflow-x-auto">
              {[...byCategory.keys()].map((cat) => (
                <a key={cat} href={`#${cat.toLowerCase().replace(/\s+/g, '-')}`} className="shrink-0 text-[13px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)] whitespace-nowrap">
                  {cat}
                  <span className="ml-1.5 text-[11px] text-[color:var(--color-ink-soft)]/50">
                    ({byCategory.get(cat)!.length})
                  </span>
                </a>
              ))}
            </nav>
          </div>
        )}

        <div className="space-y-12">
          {[...byCategory.entries()].map(([catName, products]) => (
            <section key={catName} id={catName.toLowerCase().replace(/\s+/g, '-')}>
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-serif text-[28px] sm:text-[32px] leading-tight">{catName}</h2>
                <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/65">
                  {products.length} item{products.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
                {products.map((p) => {
                  const match = discountFor({ id: p.id, vendorId: p.vendor.id, isRegulated: p.isRegulated }, discounts);
                  const priced = applyDiscount({ priceInr: p.priceInr, mrpInr: p.mrpInr, isRegulated: p.isRegulated }, match.pct);
                  const data: ProductCardData = {
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
                  return <ProductCard key={p.id} product={data} />;
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
