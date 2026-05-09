import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSuperSession } from '@/lib/super-admin-session';
import { fetchAllSnapshots, type InstanceSnapshot } from '@/lib/super-admin-snapshots';
import { SuperShell } from '@/components/super-admin/super-shell';

export const dynamic = 'force-dynamic';

export default async function SuperAdminOverview() {
  const session = await getSuperSession();
  if (!session) redirect('/super-admin/signin');

  const snapshots = await fetchAllSnapshots();
  const reachable = snapshots.filter((s) => s.ok);
  const totals = reachable.reduce(
    (a, s) => ({
      activeOrders: a.activeOrders + (s.counts?.activeOrders ?? 0),
      todayPlaced: a.todayPlaced + (s.counts?.todayPlaced ?? 0),
      todayDeliveredCount: a.todayDeliveredCount + (s.counts?.todayDeliveredCount ?? 0),
      todayGmvInr: a.todayGmvInr + (s.todayGmvInr ?? 0),
      pendingVendors: a.pendingVendors + (s.counts?.pendingVendors ?? 0),
      pendingRiders: a.pendingRiders + (s.counts?.pendingRiders ?? 0),
      pendingCampaigns: a.pendingCampaigns + (s.counts?.pendingCampaigns ?? 0),
      pendingChanges: a.pendingChanges + (s.counts?.pendingChanges ?? 0),
      totalCustomers: a.totalCustomers + (s.counts?.totalCustomers ?? 0),
    }),
    {
      activeOrders: 0, todayPlaced: 0, todayDeliveredCount: 0,
      todayGmvInr: 0,
      pendingVendors: 0, pendingRiders: 0, pendingCampaigns: 0, pendingChanges: 0,
      totalCustomers: 0,
    },
  );

  return (
    <SuperShell phone={session.phone}>
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Cross-instance overview</div>
        <h1 className="mt-2 font-serif text-[36px] sm:text-[44px] leading-[1.02] tracking-[-0.02em]">
          Every site, <span className="italic text-[color:var(--color-forest)]">on one screen.</span>
        </h1>
        <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)]">
          Read-only. Each card pulls a live snapshot from that instance&apos;s super-admin endpoint.
          Drill into a site by clicking the card, or jump straight to its admin console with the link.
        </p>
      </div>

      {/* Combined totals */}
      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Active orders · all sites" value={String(totals.activeOrders)} highlight />
        <Tile label="Placed today · all sites" value={String(totals.todayPlaced)} note={`${totals.todayDeliveredCount} delivered`} />
        <Tile label="Today's GMV · all sites" value={`₹${totals.todayGmvInr.toLocaleString('en-IN')}`} highlight />
        <Tile
          label="Awaiting review · all sites"
          value={String(totals.pendingVendors + totals.pendingRiders + totals.pendingCampaigns + totals.pendingChanges)}
          note={`${totals.pendingVendors} vendors · ${totals.pendingRiders} riders · ${totals.pendingCampaigns} campaigns · ${totals.pendingChanges} edits`}
          accent={(totals.pendingVendors + totals.pendingRiders + totals.pendingCampaigns + totals.pendingChanges) > 0}
        />
      </div>

      {/* Per-site cards */}
      <div className="mt-10">
        <h2 className="font-serif text-[22px] mb-4">Per-site detail</h2>
        {snapshots.length === 0 ? (
          <div className="rounded-2xl border border-[color:var(--color-terracotta)]/30 bg-[color:var(--color-terracotta)]/5 p-6 text-[13.5px] text-[color:var(--color-terracotta-dark)]">
            No instances configured. Set <code>SUPER_ADMIN_INSTANCES</code> on this deployment as
            comma-separated <code>slug=url</code> pairs.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {snapshots.map((s) => <SiteCard key={s.slug} s={s} />)}
          </div>
        )}
      </div>
    </SuperShell>
  );
}

function SiteCard({ s }: { s: InstanceSnapshot }) {
  if (!s.ok) {
    return (
      <div className="rounded-2xl border border-[color:var(--color-terracotta)]/30 bg-[color:var(--color-paper)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-terracotta)]">{s.slug}</div>
            <div className="font-serif text-[20px] mt-1">Snapshot unavailable</div>
            <div className="text-[12px] text-[color:var(--color-ink-soft)] mt-1">{s.url}</div>
          </div>
        </div>
        <p className="mt-3 text-[12.5px] text-[color:var(--color-terracotta-dark)]">{s.error}</p>
      </div>
    );
  }
  const c = s.counts!;
  return (
    <Link
      href={`/super-admin/sites/${s.slug}`}
      className="block rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-5 hover:border-[color:var(--color-forest)]/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">{s.site?.platformName}</div>
          <div className="font-serif text-[26px] mt-1 leading-tight">{s.site?.siteName}</div>
        </div>
        <a
          href={`${s.url}/admin`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-[11.5px] text-[color:var(--color-forest)] hover:underline shrink-0 mt-1"
        >
          Open admin →
        </a>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-y-3 gap-x-4 text-[12.5px]">
        <Row label="Active orders" value={String(c.activeOrders)} />
        <Row label="Placed today" value={`${c.todayPlaced} · ${c.todayDeliveredCount} delivered`} />
        <Row label="Today's GMV" value={`₹${(s.todayGmvInr ?? 0).toLocaleString('en-IN')}`} highlight />
        <Row label="Customers" value={String(c.totalCustomers)} />
        <Row label="Approved vendors" value={`${c.approvedVendors} · ${c.pendingVendors} pending`} accent={c.pendingVendors > 0} />
        <Row label="Approved riders" value={`${c.approvedRiders} · ${c.pendingRiders} pending`} accent={c.pendingRiders > 0} />
        <Row label="Campaigns awaiting" value={String(c.pendingCampaigns)} accent={c.pendingCampaigns > 0} />
        <Row label="Menu/edit reviews" value={String(c.pendingChanges)} accent={c.pendingChanges > 0} />
      </div>

      <div className="mt-4 pt-3 border-t border-[color:var(--color-ink)]/8 text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/55">
        {s.capturedAt ? `Snapshot · ${new Date(s.capturedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST` : ''}
      </div>
    </Link>
  );
}

function Tile({ label, value, note, highlight, accent }: { label: string; value: string; note?: string; highlight?: boolean; accent?: boolean }) {
  const cls = highlight
    ? 'border-[color:var(--color-forest)]/30 bg-gradient-to-br from-[color:var(--color-forest)]/8 to-[color:var(--color-moss)]/4'
    : accent
      ? 'border-[color:var(--color-saffron)]/40 bg-[color:var(--color-saffron)]/8'
      : 'border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)]';
  return (
    <div className={`rounded-2xl border p-5 ${cls}`}>
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-ink-soft)]/70">{label}</div>
      <div className="mt-1.5 font-serif text-[28px] leading-none">{value}</div>
      {note && <div className="mt-1.5 text-[11.5px] text-[color:var(--color-ink-soft)]/70">{note}</div>}
    </div>
  );
}

function Row({ label, value, accent, highlight }: { label: string; value: string; accent?: boolean; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/65">{label}</div>
      <div className={`mt-0.5 font-serif text-[18px] leading-none ${accent ? 'text-[color:var(--color-terracotta)]' : highlight ? 'text-[color:var(--color-forest)]' : ''}`}>
        {value}
      </div>
    </div>
  );
}
