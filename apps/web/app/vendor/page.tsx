import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';
import { VendorShell } from '@/components/vendor/vendor-shell';

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
          <h1 className="mt-3 font-serif text-[36px] sm:text-[44px] leading-[1.02] tracking-[-0.02em]">
            Your shop is waiting on <span className="italic text-[color:var(--color-forest)]">Magarpatta Go</span> review.
          </h1>
          <p className="mt-3 text-[14px] text-[color:var(--color-ink-soft)]">
            We usually approve within 24 hours. While you wait, finish filling in your shop details and menu so everything&apos;s
            ready the minute you go live.
          </p>
          {vendor?.approvalNote && (
            <div className="mt-4 rounded-xl bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 px-4 py-3 text-[13px]">
              <span className="text-[color:var(--color-ink-soft)]/70">Reviewer note:</span> {vendor.approvalNote}
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/vendor/shop" className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-2.5 text-[13.5px] font-medium hover:bg-[color:var(--color-forest-dark)]">
              Complete shop details →
            </Link>
            <Link href="/vendor/menu" className="rounded-full border border-[color:var(--color-forest)]/35 px-5 py-2.5 text-[13.5px] font-medium text-[color:var(--color-forest)] hover:bg-[color:var(--color-forest)] hover:text-[color:var(--color-cream)]">
              Add menu items →
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Open counter</div>
              <h1 className="mt-2 font-serif text-[36px] sm:text-[44px] leading-[1.02] tracking-[-0.02em]">
                Hello, <span className="italic text-[color:var(--color-forest)]">{vendor?.ownerName?.split(' ')[0] ?? 'partner'}.</span>
              </h1>
              <p className="mt-2 text-[13.5px] text-[color:var(--color-ink-soft)]">
                {todayCount === 0 ? 'Fresh day. Orders will appear below as neighbours place them.' : `${todayCount} order${todayCount === 1 ? '' : 's'} delivered today.`}
              </p>
            </div>
            <Link href="/vendor/orders" className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-2.5 text-[13.5px] font-medium hover:bg-[color:var(--color-forest-dark)] self-start sm:self-auto">
              Go to live orders →
            </Link>
          </div>

          <div className="mt-8 grid md:grid-cols-4 gap-4">
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
    <div className={`rounded-2xl border p-5 ${
      accent === 'saffron'
        ? 'border-[color:var(--color-saffron)]/35 bg-[color:var(--color-saffron)]/8'
        : 'border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)]'
    }`}>
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-ink-soft)]/70">{label}</div>
      <div className="mt-1.5 font-serif text-[28px] leading-none">{value}</div>
      {sub && <div className="mt-1.5 text-[12px] text-[color:var(--color-ink-soft)]/80">{sub}</div>}
    </div>
  );
}

function Tile({ href, title, body, cta }: { href: string; title: string; body: string; cta: string }) {
  return (
    <Link href={href} className="block rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6 hover:border-[color:var(--color-forest)]/40 transition-colors">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">{title}</div>
      <div className="mt-2 font-serif text-[22px] leading-tight">{body}</div>
      <div className="mt-3 text-[12.5px] text-[color:var(--color-forest)]">{cta}</div>
    </Link>
  );
}
