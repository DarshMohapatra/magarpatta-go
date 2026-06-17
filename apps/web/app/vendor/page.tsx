import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';
import { VendorShell } from '@/components/vendor/vendor-shell';
import { siteConfig } from '@/lib/site-config';

export const dynamic = 'force-dynamic';

function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function VendorHome() {
  const s = await getVendorSession();
  if (!s) redirect('/vendor/signin');

  const [vendor, todayOrders, incomingCount, preparingCount, lowStockCount, allTimeOrders] = await Promise.all([
    prisma.vendor.findUnique({ where: { id: s.vendorId } }),
    prisma.order.findMany({
      where: { vendorId: s.vendorId, status: 'DELIVERED', deliveredAt: { gte: startOfDay() } },
      select: { totalInr: true, subtotalInr: true },
    }),
    prisma.order.count({ where: { vendorId: s.vendorId, status: 'PLACED' } }),
    prisma.order.count({ where: { vendorId: s.vendorId, status: { in: ['ACCEPTED', 'PREPARING'] } } }),
    prisma.product.count({ where: { vendorId: s.vendorId, inStock: false } }),
    prisma.order.count({ where: { vendorId: s.vendorId } }),
  ]);

  const todayGross = todayOrders.reduce((n, o) => n + o.subtotalInr, 0);
  const todayCount = todayOrders.length;
  const commissionPct = vendor?.commissionPct ?? 15;
  const todayPayout = todayGross - Math.round((todayGross * commissionPct) / 100);
  const pending = s.approvalStatus !== 'APPROVED';

  return (
    <VendorShell shopName={s.shopName} approvalStatus={s.approvalStatus}>
      {pending ? (
        <div className="rounded-3xl border border-[color:var(--color-saffron)]/30 bg-gradient-to-br from-[color:var(--color-saffron)]/10 to-[color:var(--color-gold)]/5 p-8">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Under review</div>
          <h1 className="mt-3 font-display text-[36px] sm:text-[44px] leading-[1.02] tracking-[-0.02em]">
            Your shop is waiting on <span className="italic text-[color:var(--color-primary)]">{siteConfig.platformName}</span> review.
          </h1>
          <p className="mt-3 text-[14px] text-[color:var(--color-muted)]">
            We usually approve within 24 hours. While you wait, finish filling in your shop details and menu so everything&apos;s
            ready the minute you go live.
          </p>
          {vendor?.approvalNote && (
            <div className="mt-4 rounded-xl bg-[color:var(--color-surface)] border border-[color:var(--color-foreground)]/10 px-4 py-3 text-[13px]">
              <span className="text-[color:var(--color-muted)]/70">Reviewer note:</span> {vendor.approvalNote}
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/vendor/shop" className="rounded-full bg-[color:var(--color-primary)] text-[color:var(--color-background)] px-5 py-2.5 text-[13.5px] font-medium hover:bg-[color:var(--color-primary)]">
              Complete shop details →
            </Link>
            <Link href="/vendor/menu" className="rounded-full border border-[color:var(--color-primary)]/35 px-5 py-2.5 text-[13.5px] font-medium text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)] hover:text-[color:var(--color-background)]">
              Add menu items →
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Gradient-warm hero — matches customer-side Lovable */}
          <div className="relative overflow-hidden rounded-[var(--radius-2xl)] gradient-warm text-white p-6 sm:p-7 shadow-[var(--shadow-glow)]">
            <div className="absolute -top-8 -right-8 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.18em] font-semibold opacity-90">
                  Open counter · {siteConfig.platformName}
                </div>
                <h1 className="mt-2 font-display text-[28px] sm:text-[34px] leading-tight tracking-tight">
                  Hello, {vendor?.ownerName?.split(' ')[0] ?? 'partner'}.
                </h1>
                <p className="mt-1 text-[13px] opacity-90">
                  {todayCount === 0
                    ? 'Fresh day. Orders will appear below as neighbours place them.'
                    : `${todayCount} order${todayCount === 1 ? '' : 's'} delivered today · ₹${todayGross.toLocaleString('en-IN')} gross`}
                </p>
              </div>
              <Link
                href="/vendor/orders"
                className="rounded-full bg-white text-[color:var(--color-primary)] px-4 py-2 text-[13px] font-semibold shadow-[var(--shadow-soft)] self-start sm:self-auto"
              >
                Go to live orders →
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Today's sales" value={`₹${todayGross.toLocaleString('en-IN')}`} sub={`${todayCount} delivered`} />
            <StatCard label="Today's payout" value={`₹${todayPayout.toLocaleString('en-IN')}`} sub={`after ${commissionPct}% commission`} />
            <StatCard label="New orders" value={String(incomingCount)} sub="waiting to accept" accent={incomingCount > 0 ? 'saffron' : undefined} />
            <StatCard label="In kitchen" value={String(preparingCount)} sub="accepted / preparing" />
          </div>

          <div className="mt-10 grid md:grid-cols-2 gap-4">
            <Tile
              href="/vendor/menu"
              title="Menu"
              body={lowStockCount > 0 ? `${lowStockCount} item${lowStockCount === 1 ? '' : 's'} out of stock` : 'All items in stock'}
              cta="Open menu →"
            />
            <Tile
              href="/vendor/payouts"
              title="Payouts"
              body={`${allTimeOrders} total orders lifetime · commission ${commissionPct}%`}
              cta="See payout history →"
            />
          </div>
        </>
      )}
    </VendorShell>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className={`rounded-[var(--radius-xl)] border p-4 shadow-[var(--shadow-soft)] ${
      accent === 'saffron'
        ? 'border-[color:var(--color-saffron)]/35 bg-[color:var(--color-saffron)]/8'
        : 'border-[color:var(--color-border)]/60 bg-[color:var(--color-surface)]'
    }`}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-muted)] font-semibold">{label}</div>
      <div className={`mt-1.5 font-display text-[26px] leading-none ${accent === 'saffron' ? 'text-[color:var(--color-saffron)]' : ''}`}>{value}</div>
      {sub && <div className="mt-1.5 text-[11.5px] text-[color:var(--color-muted)]/80">{sub}</div>}
    </div>
  );
}

function Tile({ href, title, body, cta }: { href: string; title: string; body: string; cta: string }) {
  return (
    <Link href={href} className="block rounded-2xl border border-[color:var(--color-foreground)]/10 bg-[color:var(--color-surface)] p-6 hover:border-[color:var(--color-primary)]/40 transition-colors">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">{title}</div>
      <div className="mt-2 font-display text-[22px] leading-tight">{body}</div>
      <div className="mt-3 text-[12.5px] text-[color:var(--color-primary)]">{cta}</div>
    </Link>
  );
}
