import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getSuperSession } from '@/lib/super-admin-session';
import { fetchSnapshotBySlug } from '@/lib/super-admin-snapshots';
import { SuperShell } from '@/components/super-admin/super-shell';

export const dynamic = 'force-dynamic';

export default async function SuperAdminSiteDetail({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSuperSession();
  if (!session) redirect('/super-admin/signin');

  const { slug } = await params;
  const snapshot = await fetchSnapshotBySlug(slug);
  if (!snapshot) notFound();

  return (
    <SuperShell phone={session.phone}>
      <Link href="/super-admin" className="text-[12.5px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)]">
        ← Overview
      </Link>

      {!snapshot.ok ? (
        <div className="mt-6 rounded-2xl border border-[color:var(--color-terracotta)]/30 bg-[color:var(--color-terracotta)]/5 p-6">
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-terracotta)]">{snapshot.slug}</div>
          <h1 className="mt-2 font-serif text-[32px]">Snapshot unavailable</h1>
          <p className="mt-3 text-[13px] text-[color:var(--color-terracotta-dark)]">{snapshot.error}</p>
          <p className="mt-4 text-[12.5px] text-[color:var(--color-ink-soft)]">URL: {snapshot.url}</p>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">{snapshot.site?.platformName}</div>
            <h1 className="mt-2 font-serif text-[36px] sm:text-[44px] leading-[1.02] tracking-[-0.02em]">{snapshot.site?.siteName}</h1>
            <p className="mt-2 text-[12.5px] text-[color:var(--color-ink-soft)]">
              <a href={snapshot.url} target="_blank" rel="noreferrer" className="hover:text-[color:var(--color-forest)] underline underline-offset-2">{snapshot.url}</a>
              {' · '}
              <a href={`${snapshot.url}/admin`} target="_blank" rel="noreferrer" className="hover:text-[color:var(--color-forest)] underline underline-offset-2">Open this site&apos;s admin →</a>
            </p>
          </div>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Tile label="Active orders" value={String(snapshot.counts!.activeOrders)} highlight />
            <Tile label="Placed today" value={String(snapshot.counts!.todayPlaced)} note={`${snapshot.counts!.todayDeliveredCount} delivered`} />
            <Tile label="Today's GMV" value={`₹${(snapshot.todayGmvInr ?? 0).toLocaleString('en-IN')}`} highlight />
            <Tile label="Customers" value={String(snapshot.counts!.totalCustomers)} />
          </div>

          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Tile label="Approved vendors" value={String(snapshot.counts!.approvedVendors)} note={`${snapshot.counts!.pendingVendors} pending`} accent={snapshot.counts!.pendingVendors > 0} />
            <Tile label="Approved riders" value={String(snapshot.counts!.approvedRiders)} note={`${snapshot.counts!.pendingRiders} pending`} accent={snapshot.counts!.pendingRiders > 0} />
            <Tile label="Campaigns awaiting" value={String(snapshot.counts!.pendingCampaigns)} accent={snapshot.counts!.pendingCampaigns > 0} />
            <Tile label="Menu / edit reviews" value={String(snapshot.counts!.pendingChanges)} accent={snapshot.counts!.pendingChanges > 0} />
          </div>

          <div className="mt-10">
            <h2 className="font-serif text-[22px] mb-3">Recent activity</h2>
            {(snapshot.recentActivity?.length ?? 0) === 0 ? (
              <p className="text-[13px] text-[color:var(--color-ink-soft)]/70">No activity yet on this site.</p>
            ) : (
              <ul className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] divide-y divide-[color:var(--color-ink)]/8 overflow-hidden">
                {snapshot.recentActivity!.map((a) => (
                  <li key={a.id} className="px-5 py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/65">
                        {a.actorRole.toLowerCase()} · {a.actorName} · {a.action.toLowerCase().replace(/_/g, ' ')}
                      </div>
                      <div className="mt-0.5 text-[13.5px] text-[color:var(--color-ink)]">{a.summary}</div>
                    </div>
                    <div className="shrink-0 text-[11.5px] text-[color:var(--color-ink-soft)]/65 whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-6 text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/55">
            Snapshot · {snapshot.capturedAt ? new Date(snapshot.capturedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''} IST
          </p>
        </>
      )}
    </SuperShell>
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
