import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCustomerScope } from '@/lib/customer-scope';
import { CartDrawer } from '@/components/cart-drawer';
import { statusLabel } from '@/lib/orders';
import { ProductGlyph } from '@/components/product-glyph';
import { ReorderButton } from '@/components/reorder-button';
import { getServerLocale } from '@/lib/locale';
import { getServerSession } from '@/lib/session';
import { pickName } from '@/lib/i18n';
import { MobileShell } from '@/components/customer/mobile-shell';
import { TopBar } from '@/components/customer/top-bar';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const scope = await getCustomerScope();
  if (!scope) redirect('/signin');

  // Wrapper auto-applies userId — empty where is safe.
  const [orders, locale, session] = await Promise.all([
    scope.db.order.findMany({
      orderBy: { placedAt: 'desc' },
      include: { items: true },
    }),
    getServerLocale(),
    getServerSession(),
  ]);

  return (
    <>
    <MobileShell topBar={<TopBar session={session} />}>
      <section className="pt-4 pb-12">
        <div className="px-4 lg:px-8 max-w-[1080px] mx-auto">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Your orders</div>
          <h1 className="mt-3 font-display text-[44px] lg:text-[56px] leading-[0.98] tracking-[-0.02em]">
            Every drop-off, <span className="italic text-[color:var(--color-primary)]">on record.</span>
          </h1>

          {orders.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-[color:var(--color-foreground)]/10 bg-[color:var(--color-surface)] p-10 text-center">
              <p className="font-display text-[26px] leading-tight">
                Nothing yet.
              </p>
              <p className="mt-2 text-[14px] text-[color:var(--color-muted)]">
                Your first order lands here the moment you place it.
              </p>
              <Link
                href="/menu"
                className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full text-[13.5px] font-medium bg-[color:var(--color-primary)] text-[color:var(--color-background)] hover:bg-[color:var(--color-primary)]"
              >
                Browse the menu
              </Link>
            </div>
          ) : (
            <ul className="mt-10 space-y-4">
              {orders.map((o) => {
                const status = o.status;
                const label = statusLabel(status);
                const isLive = status !== 'DELIVERED' && status !== 'CANCELLED';

                const reorderItems = o.items.map((i) => ({
                  productId: i.productId,
                  name: i.name,
                  nameHi: i.nameHi,
                  nameMr: i.nameMr,
                  vendorName: i.vendorName,
                  unit: i.unit,
                  priceInr: i.priceInr,
                  mrpInr: i.mrpInr,
                  isRegulated: i.isRegulated,
                  quantity: i.quantity,
                  accent: i.accent,
                  glyph: i.glyph,
                  imageUrl: i.imageUrl,
                  soldByWeight: i.soldByWeight,
                  estimatedGrams: i.estimatedGrams,
                }));

                return (
                  <li key={o.id} className="rounded-2xl border border-[color:var(--color-foreground)]/10 bg-[color:var(--color-surface)] hover:border-[color:var(--color-primary)]/30 transition-colors overflow-hidden">
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
                                  : 'bg-[color:var(--color-primary)]'
                              }`}
                            />
                            <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-muted)]/80">
                              {label}
                            </span>
                            <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-muted)]/50">
                              · #{o.id.slice(-6)}
                            </span>
                          </div>
                          <div className="font-display text-[22px] leading-tight text-[color:var(--color-foreground)]">
                            {o.items.slice(0, 2).map((i) => pickName(i, locale)).join(', ')}
                            {o.items.length > 2 && (
                              <span className="text-[color:var(--color-muted)]"> · +{o.items.length - 2} more</span>
                            )}
                          </div>
                          <div className="mt-1 text-[13px] text-[color:var(--color-muted)]/80">
                            Flat {o.flat}, {o.building} · {o.society}
                          </div>
                          <div className="mt-2 text-[12px] text-[color:var(--color-muted)]/60">
                            {new Date(o.placedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST
                          </div>
                        </div>

                        {/* Item thumbs */}
                        <div className="hidden sm:flex -space-x-2 shrink-0">
                          {o.items.slice(0, 3).map((i) => (
                            <div
                              key={i.id}
                              className="h-10 w-10 rounded-full border-2 border-[color:var(--color-surface)] flex items-center justify-center overflow-hidden relative"
                              style={{ backgroundColor: `color-mix(in srgb, var(--color-${i.accent ?? 'forest'}) 14%, var(--color-surface))` }}
                            >
                              {i.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={i.imageUrl} alt={pickName(i, locale)} className="absolute inset-0 w-full h-full object-cover" />
                              ) : (
                                <div className="scale-[0.4]"><ProductGlyph glyph={i.glyph} accent={i.accent} /></div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-display text-[22px] text-[color:var(--color-primary)]">₹{o.totalInr}</div>
                          <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-muted)]/60">
                            {o.items.reduce((s, i) => s + i.quantity, 0)} item{o.items.reduce((s, i) => s + i.quantity, 0) === 1 ? '' : 's'}
                          </div>
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-[color:var(--color-foreground)]/8 bg-[color:var(--color-background)]/40">
                      <Link
                        href={`/orders/${o.id}`}
                        className="text-[12px] text-[color:var(--color-muted)] hover:text-[color:var(--color-primary)]"
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
    </MobileShell>
    <CartDrawer />
    </>
  );
}
