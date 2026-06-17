import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { getCustomerScope } from '@/lib/customer-scope';
import { CartDrawer } from '@/components/cart-drawer';
import { statusLabel } from '@/lib/orders';
import { ProductGlyph } from '@/components/product-glyph';
import { ReorderButton } from '@/components/reorder-button';
import { getServerLocale } from '@/lib/locale';
import { getServerSession } from '@/lib/session';
import { pickName, type Locale } from '@/lib/i18n';
import { MobileShell } from '@/components/customer/mobile-shell';
import { TopBar } from '@/components/customer/top-bar';

type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const scope = await getCustomerScope();
  if (!scope) redirect('/signin');

  const [orders, locale, session] = await Promise.all([
    scope.db.order.findMany({
      orderBy: { placedAt: 'desc' },
      include: { items: true },
    }),
    getServerLocale(),
    getServerSession(),
  ]);

  const liveOrders = orders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  const pastOrders = orders.filter((o) => o.status === 'DELIVERED' || o.status === 'CANCELLED');

  return (
    <>
      <MobileShell topBar={<TopBar session={session} />}>
        <section className="px-4 pt-4">
          <div className="relative overflow-hidden rounded-[var(--radius-2xl)] gradient-warm text-white p-5 shadow-[var(--shadow-glow)]">
            <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
            <div className="relative">
              <div className="text-[10px] uppercase tracking-[0.18em] font-semibold opacity-90">Your orders</div>
              <h1 className="mt-2 font-display text-[26px] leading-tight tracking-tight">
                Every drop-off, on record.
              </h1>
              <p className="mt-1 text-[12.5px] opacity-90">
                {liveOrders.length > 0
                  ? `${liveOrders.length} in progress · ${pastOrders.length} delivered`
                  : `${pastOrders.length} order${pastOrders.length === 1 ? '' : 's'} so far`}
              </p>
            </div>
          </div>
        </section>

        <section className="pb-12">
          <div className="px-4 lg:px-8 max-w-[1080px] mx-auto">
            {orders.length === 0 ? (
              <div className="mt-6 rounded-[var(--radius-2xl)] bg-[color:var(--color-surface)] border border-[color:var(--color-border)]/60 shadow-[var(--shadow-soft)] p-10 text-center">
                <p className="font-display text-[22px] leading-tight">Nothing yet.</p>
                <p className="mt-2 text-[13px] text-[color:var(--color-muted)]">
                  Your first order lands here the moment you place it.
                </p>
                <Link
                  href="/menu"
                  className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full text-[13.5px] font-semibold bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] shadow-[var(--shadow-soft)] active:scale-[0.98] transition-transform"
                >
                  Browse the menu
                </Link>
              </div>
            ) : (
              <>
                {liveOrders.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--color-saffron)] text-[color:var(--color-saffron)] pulse-ring" />
                      <h2 className="font-display text-[12px] font-bold tracking-[0.16em] uppercase opacity-80">
                        Live now
                      </h2>
                    </div>
                    <ul className="space-y-3">
                      {liveOrders.map((o) => (
                        <OrderCard key={o.id} order={o} locale={locale} isLive />
                      ))}
                    </ul>
                  </div>
                )}
                {pastOrders.length > 0 && (
                  <div className="mt-6">
                    <h2 className="font-display text-[12px] font-bold tracking-[0.16em] uppercase opacity-80 mb-3">
                      Past orders
                    </h2>
                    <ul className="space-y-3">
                      {pastOrders.map((o) => (
                        <OrderCard key={o.id} order={o} locale={locale} isLive={false} />
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </MobileShell>
      <CartDrawer />
    </>
  );
}

function OrderCard({
  order: o,
  locale,
  isLive,
}: {
  order: OrderWithItems;
  locale: Locale;
  isLive: boolean;
}) {
  const label = statusLabel(o.status);
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
  const totalItems = o.items.reduce((s, i) => s + i.quantity, 0);
  return (
    <li
      className={
        'rounded-[var(--radius-xl)] shadow-[var(--shadow-soft)] overflow-hidden transition-all ' +
        (isLive
          ? 'bg-[color:var(--color-primary-soft)] border border-[color:var(--color-primary)]/30'
          : 'bg-[color:var(--color-surface)] border border-[color:var(--color-border)]/60 hover:border-[color:var(--color-primary)]/30')
      }
    >
      <Link href={`/orders/${o.id}`} className="block p-4 lg:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                  isLive
                    ? 'bg-[color:var(--color-saffron)] text-[color:var(--color-saffron)] pulse-ring'
                    : 'bg-[color:var(--color-primary)]'
                }`}
              />
              <span className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[color:var(--color-foreground)]/80">
                {label}
              </span>
              <span className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-muted)]/60">
                · #{o.id.slice(-6)}
              </span>
            </div>
            <div className="font-display text-[16px] lg:text-[18px] font-semibold leading-tight text-[color:var(--color-foreground)] truncate">
              {o.items.slice(0, 2).map((i) => pickName(i, locale)).join(', ')}
              {o.items.length > 2 && (
                <span className="text-[color:var(--color-muted)] font-normal"> · +{o.items.length - 2} more</span>
              )}
            </div>
            <div className="mt-1 text-[12px] text-[color:var(--color-muted)] truncate">
              Flat {o.flat}, {o.building} · {o.society}
            </div>
            <div className="mt-1 text-[11px] text-[color:var(--color-muted)]/70">
              {new Date(o.placedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST
            </div>
          </div>

          <div className="hidden sm:flex -space-x-2 shrink-0">
            {o.items.slice(0, 3).map((i) => (
              <div
                key={i.id}
                className="h-9 w-9 rounded-full border-2 border-[color:var(--color-surface)] flex items-center justify-center overflow-hidden relative"
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
            <div className="font-display text-[18px] font-bold text-[color:var(--color-primary)]">₹{o.totalInr}</div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-muted)]/65">
              {totalItems} item{totalItems === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-3 px-4 lg:px-5 py-2.5 border-t border-[color:var(--color-border)]/40 bg-[color:var(--color-background)]/30">
        <Link
          href={`/orders/${o.id}`}
          className="text-[12px] font-semibold text-[color:var(--color-primary)] hover:underline"
        >
          {isLive ? 'Track order →' : 'View details →'}
        </Link>
        <ReorderButton items={reorderItems} variant="outline" />
      </div>
    </li>
  );
}
