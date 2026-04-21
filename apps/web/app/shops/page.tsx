import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { NavbarWithSession } from '@/components/navbar-with-session';
import { Footer } from '@/components/footer';
import { CartDrawer } from '@/components/cart-drawer';

export const dynamic = 'force-dynamic';

const ACCENT_BG: Record<string, string> = {
  saffron: 'bg-[color:var(--color-saffron)]/12',
  forest: 'bg-[color:var(--color-forest)]/10',
  terracotta: 'bg-[color:var(--color-terracotta)]/12',
  gold: 'bg-[color:var(--color-gold)]/12',
};

export default async function ShopsPage() {
  const vendors = await prisma.vendor.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    include: {
      products: {
        where: { inStock: true },
        orderBy: { priceInr: 'desc' },
        take: 3,
        select: { id: true, name: true, priceInr: true, mrpInr: true, imageUrl: true, glyph: true, accent: true },
      },
      _count: { select: { products: { where: { inStock: true } } } },
    },
  });

  return (
    <main className="relative z-10 min-h-screen">
      <NavbarWithSession />

      <section className="pt-24 pb-16">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="mb-8">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">
              Partner shops · {vendors.length} live
            </div>
            <h1 className="mt-3 font-serif text-[40px] sm:text-[56px] leading-[0.98] tracking-[-0.02em]">
              Browse by <span className="italic text-[color:var(--color-forest)]">shop.</span>
            </h1>
            <p className="mt-3 text-[14.5px] text-[color:var(--color-ink-soft)] max-w-2xl">
              Every partner in Magarpatta or adjacent. Tap one to see their full menu, hours, and
              current stock.
            </p>
            <div className="mt-4">
              <Link href="/menu" className="text-[13px] text-[color:var(--color-forest)] hover:underline underline-offset-4">
                ← Or browse everything by category
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {vendors.map((v) => (
              <Link
                key={v.slug}
                href={`/shops/${v.slug}`}
                className="group rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(14,17,12,0.22)] transition-all"
              >
                <div className={`p-5 ${ACCENT_BG[v.accent ?? 'forest'] ?? ACCENT_BG.forest}`}>
                  <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">
                    {v.hub}
                  </div>
                  <h2 className="mt-2 font-serif text-[26px] leading-tight text-[color:var(--color-ink)]">
                    {v.name}
                  </h2>
                  {v.description && (
                    <p className="mt-2 text-[12.5px] leading-[1.5] text-[color:var(--color-ink-soft)] line-clamp-2">
                      {v.description}
                    </p>
                  )}
                </div>
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {v.products.slice(0, 3).map((p) => (
                      <div
                        key={p.id}
                        className="h-9 w-9 rounded-full border-2 border-[color:var(--color-paper)] overflow-hidden"
                        style={{ backgroundColor: `color-mix(in srgb, var(--color-${p.accent ?? 'forest'}) 14%, var(--color-paper))` }}
                      >
                        {p.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/65">
                      {v._count.products} items
                    </span>
                    <span className="text-[color:var(--color-forest)] group-hover:translate-x-1 transition-transform">
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <CartDrawer />
    </main>
  );
}
