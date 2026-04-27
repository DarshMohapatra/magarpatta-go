import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';
import { AdminShell } from '@/components/admin/admin-shell';

export const dynamic = 'force-dynamic';

function startOfDay(): Date {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}

export default async function AdminHome() {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/signin');

  const [pendingVendors, pendingRiders, pendingCampaigns, activeOrders, todayOrders, todayDelivered, totalVendors, totalRiders, totalCustomers] = await Promise.all([
    prisma.vendor.count({ where: { approvalStatus: 'PENDING' } }),
    prisma.riderProfile.count({ where: { approvalStatus: 'PENDING' } }),
    prisma.campaign.count({ where: { approvalStatus: 'PENDING' } }),
    prisma.order.count({ where: { status: { in: ['PLACED', 'ACCEPTED', 'PREPARING', 'PICKED_UP', 'OUT_FOR_DELIVERY'] } } }),
    prisma.order.count({ where: { placedAt: { gte: startOfDay() } } }),
    prisma.order.findMany({
      where: { status: 'DELIVERED', deliveredAt: { gte: startOfDay() } },
      select: { totalInr: true, subtotalInr: true },
    }),
    prisma.vendor.count({ where: { approvalStatus: 'APPROVED' } }),
    prisma.riderProfile.count({ where: { approvalStatus: 'APPROVED' } }),
    prisma.user.count(),
  ]);

  const todayGMV = todayDelivered.reduce((n, o) => n + o.totalInr, 0);

  return (
    <AdminShell name={admin.name} role={admin.role}>
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Ops overview</div>
        <h1 className="mt-2 font-serif text-[36px] sm:text-[44px] leading-[1.02] tracking-[-0.02em]">
          Magarpatta Go, <span className="italic text-[color:var(--color-forest)]">under your watch.</span>
        </h1>
      </div>

      <div className="mt-8 grid md:grid-cols-4 gap-4">
        <Stat label="Pending vendors" value={String(pendingVendors)} accent={pendingVendors > 0 ? 'saffron' : undefined} href="/admin/vendors?status=PENDING" />
        <Stat label="Pending riders" value={String(pendingRiders)} accent={pendingRiders > 0 ? 'saffron' : undefined} href="/admin/riders?status=PENDING" />
        <Stat label="Active orders" value={String(activeOrders)} href="/admin/orders" />
        <Stat label="Today's GMV" value={`₹${todayGMV.toLocaleString('en-IN')}`} note={`${todayDelivered.length} delivered / ${todayOrders} placed`} href="/admin/finance" />
      </div>

      <div className="mt-6 grid md:grid-cols-3 lg:grid-cols-3 gap-4">
        <Stat label="Campaigns awaiting review" value={String(pendingCampaigns)} accent={pendingCampaigns > 0 ? 'saffron' : undefined} href="/admin/campaigns" />
        <MiniStat label="Approved vendors" value={String(totalVendors)} href="/admin/vendors?status=APPROVED" />
        <MiniStat label="Approved riders" value={String(totalRiders)} href="/admin/riders?status=APPROVED" />
      </div>

      <div className="mt-3 grid md:grid-cols-2 gap-4">
        <MiniStat label="Customers" value={String(totalCustomers)} href="/admin/customers" />
      </div>

      <div className="mt-10">
        <h2 className="font-serif text-[22px] mb-3">Quick actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Tile href="/admin/vendors?status=PENDING" title="Review vendor applications" body="Approve or reject new shops waiting to go live." />
          <Tile href="/admin/riders?status=PENDING" title="Review rider applications" body="Verify DL, Aadhaar, vehicle RC before approval." />
          <Tile href="/admin/campaigns" title="Pending campaigns" body="Flash sales, festival pushes, late-night deals." />
          <Tile href="/admin/orders" title="Live orders board" body="Reassign riders, cancel with refund note." />
        </div>
      </div>
    </AdminShell>
  );
}

function Stat({ label, value, note, accent, href }: { label: string; value: string; note?: string; accent?: string; href: string }) {
  const cls = accent === 'saffron'
    ? 'border-[color:var(--color-saffron)]/40 bg-[color:var(--color-saffron)]/8'
    : 'border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)]';
  return (
    <Link href={href} className={`block rounded-2xl border p-5 hover:border-[color:var(--color-forest)]/40 transition-colors ${cls}`}>
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-ink-soft)]/70">{label}</div>
      <div className="mt-1.5 font-serif text-[30px] leading-none">{value}</div>
      {note && <div className="mt-1.5 text-[11.5px] text-[color:var(--color-ink-soft)]/70">{note}</div>}
    </Link>
  );
}

function MiniStat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="block rounded-xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-4 hover:border-[color:var(--color-forest)]/30">
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/65">{label}</div>
      <div className="mt-1 font-serif text-[22px]">{value}</div>
    </Link>
  );
}

function Tile({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="block rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-5 hover:border-[color:var(--color-forest)]/40 transition-colors">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">{title}</div>
      <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)]">{body}</p>
    </Link>
  );
}
