import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';
import { NavbarWithSession } from '@/components/navbar-with-session';
import { Footer } from '@/components/footer';
import { CartDrawer } from '@/components/cart-drawer';
import { expectedStatusForElapsed, statusLabel } from '@/lib/orders';
import { ProductGlyph } from '@/components/product-glyph';
import { ReorderButton } from '@/components/reorder-button';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const session = await getServerSession();
  if (!session) redirect('/signin');

  const user = await prisma.user.findUnique({ where: { phone: session.phone } });
  const orders = user
    ? await prisma.order.findMany({
        where: { userId: user.id },
        orderBy: { placedAt: 'desc' },
        include: { items: true },
      })
    : [];

  const now = Date.now();

  return (
    <main className="relative z-10 min-h-screen">
      <NavbarWithSession />

      <section className="pt-24 pb-20">
        <div className="mx-auto max-w-[1080px] px-6 lg:px-10">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Your orders</div>
          <h1 className="mt-3 font-serif text-[44px] lg:text-[56px] leading-[0.98] tracking-[-0.02em]">
            Every drop-off, <span className="italic text-[color:var(--color-forest)]">on record.</span>
          </h1>

          {orders.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-10 text-center">
              <p className="font-serif text-[26px] leading-tight">
                Nothing yet.
              </p>
              <p className="mt-2 text-[14px] text-[color:var(--color-ink-soft)]">
                Your first order lands here the moment you place it.
              </p>
              <Link
                href="/menu"
                className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full text-[13.5px] font-medium bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)]"
              >
                Browse the menu
              </Link>
            </div>
          ) : (
            <ul className="mt-10 space-y-4">
              {orders.map((o) => {
                const elapsed = Math.floor((now - o.placedAt.getTime()) / 1000);
                const status = expectedStatusForElapsed(elapsed);
                const label = statusLabel(status);
                const isLive = status !== 'DELIVERED' && status !== 'CANCELLED';

                const reorderItems = o.items.map((i) => ({
                  productId: i.productId,
                  name: i.name,
                  vendorName: i.vendorName,
                  unit: i.unit,
                  priceInr: i.priceInr,
                  mrpInr: i.mrpInr,
                  isRegulated: i.isRegulated,
                  quantity: i.quantity,
                  accent: i.accent,
                  glyph: i.glyph,
                  imageUrl: i.imageUrl,
                }));

                return (
                  <li key={o.id} className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] hover:border-[color:var(--color-forest)]/30 transition-colors overflow-hidden">
                    <Link
                      href={`/orders/${o.id}`}
                      className="block p-6"
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-2">
                            <span
                              className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                                isLive
                                  ? 'bg-[color:var(--color-saffron)] text-[color:var(--color-saffron)] pulse-ring'
                                  : 'bg-[color:var(--color-forest)]'
                              }`}
                            />
                            <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/80">
                              {label}
                            </span>
                            <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/50">
                              · #{o.id.slice(-6)}
                            </span>
                          </div>
                          <div className="font-serif text-[22px] leading-tight text-[color:var(--color-ink)]">
                            {o.items.slice(0, 2).map((i) => i.name).join(', ')}
                            {o.items.length > 2 && (
                              <span className="text-[color:var(--color-ink-soft)]"> · +{o.items.length - 2} more</span>
                            )}
                          </div>
                          <div className="mt-1 text-[13px] text-[color:var(--color-ink-soft)]/80">
                            Flat {o.flat}, {o.building} · {o.society}
                          </div>
                          <div className="mt-2 text-[12px] text-[color:var(--color-ink-soft)]/60">
                            {new Date(o.placedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST
                          </div>
                        </div>

                        {/* Item thumbs */}
                        <div className="hidden sm:flex -space-x-2 shrink-0">
                          {o.items.slice(0, 3).map((i) => (
                            <div
                              key={i.id}
                              className="h-10 w-10 rounded-full border-2 border-[color:var(--color-paper)] flex items-center justify-center overflow-hidden relative"
                              style={{ backgroundColor: `color-mix(in srgb, var(--color-${i.accent ?? 'forest'}) 14%, var(--color-paper))` }}
                            >
                              {i.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={i.imageUrl} alt={i.name} className="absolute inset-0 w-full h-full object-cover" />
                              ) : (
                                <div className="scale-[0.4]"><ProductGlyph glyph={i.glyph} accent={i.accent} /></div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-serif text-[22px] text-[color:var(--color-forest)]">₹{o.totalInr}</div>
                          <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/60">
                            {o.items.reduce((s, i) => s + i.quantity, 0)} item{o.items.reduce((s, i) => s + i.quantity, 0) === 1 ? '' : 's'}
                          </div>
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-[color:var(--color-ink)]/8 bg-[color:var(--color-cream)]/40">
                      <Link
                        href={`/orders/${o.id}`}
                        className="text-[12px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)]"
                      >
                        View details →
                      </Link>
                      <ReorderButton items={reorderItems} variant="outline" />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <Footer />
      <CartDrawer />
    </main>
  );
}
