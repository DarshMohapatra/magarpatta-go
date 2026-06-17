import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';
import { AdminShell } from '@/components/admin/admin-shell';
import { siteConfig } from '@/lib/site-config';

export const dynamic = 'force-dynamic';

/**
 * Townships management — Lovable spec calls for a card grid showing
 * Live / Coming-soon townships with per-township vendor + order counts.
 * Phase 1 we're single-site; this page lists the current township from
 * lib/site-config plus a couple of placeholder "coming soon" cards so
 * the layout reads correctly while the multi-site model is built out.
 */
export default async function AdminTownships() {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/signin');

  const [vendorCount, orderCount] = await Promise.all([
    prisma.vendor.count({ where: { active: true } }),
    prisma.order.count({ where: { placedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
  ]);

  const live = [{
    name: siteConfig.siteName,
    city: siteConfig.city,
    state: 'Maharashtra',
    vendorCount,
    orderCount,
  }];
  const comingSoon = [
    { name: 'Amanora Park Town', city: 'Pune', state: 'Maharashtra' },
    { name: 'Hadapsar Annexe', city: 'Pune', state: 'Maharashtra' },
    { name: 'Wagholi Greens', city: 'Pune', state: 'Maharashtra' },
  ];

  return (
    <AdminShell name={admin.name} role={admin.role}>
      {/* Gradient-warm hero — partner parity */}
      <div className="relative overflow-hidden rounded-[var(--radius-2xl)] gradient-warm text-white p-5 sm:p-6 shadow-[var(--shadow-glow)]">
        <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="relative">
          <div className="text-[10.5px] uppercase tracking-[0.18em] font-semibold opacity-90">Multi-township roster</div>
          <h1 className="mt-2 font-display text-[26px] sm:text-[30px] leading-tight tracking-tight">
            Townships, all of them.
          </h1>
          <p className="mt-1 text-[12.5px] opacity-90">
            {live.length} live · {comingSoon.length} coming soon · each gets its own Vercel deploy + Postgres
          </p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-[20px] font-bold tracking-tight mb-4">Live</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {live.map((t) => (
            <div key={t.name} className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-[18px] font-bold tracking-tight">{t.name}</div>
                  <div className="text-[12px] text-[color:var(--color-muted)]">{t.city}, {t.state}</div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-success)] text-white px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em]">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  Live
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <div className="font-display text-[22px] font-bold tabular-nums">{t.vendorCount}</div>
                  <div className="text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-muted)]">Vendors</div>
                </div>
                <div>
                  <div className="font-display text-[22px] font-bold tabular-nums">{t.orderCount}</div>
                  <div className="text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-muted)]">Orders (24h)</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-[20px] font-bold tracking-tight mb-4">Coming soon</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {comingSoon.map((t) => (
            <div key={t.name} className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)]/60 bg-[color:var(--color-surface-2)] p-5 opacity-80">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-[18px] font-bold tracking-tight">{t.name}</div>
                  <div className="text-[12px] text-[color:var(--color-muted)]">{t.city}, {t.state}</div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-warning)] text-[color:var(--color-foreground)] px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em]">
                  Soon
                </span>
              </div>
              <p className="mt-4 text-[12px] text-[color:var(--color-muted)] leading-snug">
                Vendor onboarding starts after the {siteConfig.siteName} launch settles.
              </p>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
