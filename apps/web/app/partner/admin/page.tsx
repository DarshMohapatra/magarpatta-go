import Link from 'next/link';
import { PartnerNav } from '@/components/partner/partner-nav';

export const dynamic = 'force-static';

const RESPONSIBILITIES = [
  { title: 'Approve vendors', body: 'Verify FSSAI / GSTIN / bank before shops go live. First-look + fulfilment toggle.' },
  { title: 'Onboard riders', body: 'Verify DL, Aadhaar, RC. Manage the roster, suspend if something goes wrong.' },
  { title: 'Live order board', body: 'Every active order across the township — reassign, cancel, compensate.' },
  { title: 'Finance reconciliation', body: 'GMV, take-rate, commission by vendor. Exports feed into Tally.' },
  { title: 'Customer support', body: 'Search by phone. Pull order history. Issue refunds. Block if abusive.' },
  { title: 'Zone & pricing', body: 'Magarpatta polygon, pincodes, delivery fee rules, surge windows.' },
];

export default function AdminLandingPage() {
  return (
    <main className="relative min-h-screen">
      <PartnerNav />

      <section className="pt-36 pb-20 sm:pt-44">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <div className="grid lg:grid-cols-[1.15fr_1fr] gap-14 items-center">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-terracotta)]">Internal access</div>
              <h1 className="mt-4 font-serif text-[44px] sm:text-[58px] lg:text-[72px] leading-[0.98] tracking-[-0.02em]">
                Operations{' '}
                <span className="italic text-[color:var(--color-forest)]">console.</span>
              </h1>
              <p className="mt-6 text-[15px] sm:text-[16.5px] leading-[1.55] text-[color:var(--color-ink-soft)] max-w-[540px]">
                The small, quiet room where Magarpatta Go stays honest. Vendors, riders, orders, and money —
                all visible, all reversible, all logged. If you&apos;re on the ops team, sign in below.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/admin/signin" className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)] px-6 py-3.5 text-[14px] font-medium transition-colors">
                  Admin sign in
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
              <p className="mt-6 text-[12px] text-[color:var(--color-ink-soft)]/70">
                Admin accounts are created by the super-admin only. Entry attempts are logged.
              </p>
            </div>

            {/* KPI mock */}
            <div className="rounded-3xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6 sm:p-8 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Kpi label="Pending vendors" value="3" accent="saffron" />
                <Kpi label="Pending riders" value="1" accent="saffron" />
                <Kpi label="Active orders" value="12" />
                <Kpi label="Today's GMV" value="₹48,240" highlight />
              </div>
              <div className="rounded-xl border border-[color:var(--color-ink)]/10 p-4">
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">Audit log</div>
                <ul className="mt-2 space-y-1.5 text-[12px] text-[color:var(--color-ink-soft)]/85">
                  <li>14:22 · Approved Demo Dosa House (vendor)</li>
                  <li>14:09 · Reassigned order #a1f20c to Priya S.</li>
                  <li>13:51 · Cancelled order #9b2244 · refund ₹240</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[color:var(--color-paper)] border-y border-[color:var(--color-ink)]/8">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <div className="max-w-[640px]">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-terracotta)]">What the console covers</div>
            <h2 className="mt-3 font-serif text-[36px] sm:text-[48px] leading-[1.02] tracking-[-0.02em]">
              Everything{' '}
              <span className="italic text-[color:var(--color-forest)]">visible.</span>
            </h2>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {RESPONSIBILITIES.map((r) => (
              <div key={r.title} className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-cream)]/60 p-6">
                <h3 className="font-serif text-[20px] leading-tight">{r.title}</h3>
                <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)] leading-[1.55]">{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Kpi({ label, value, accent, highlight }: { label: string; value: string; accent?: string; highlight?: boolean }) {
  const cls = highlight
    ? 'border-[color:var(--color-forest)]/30 bg-gradient-to-br from-[color:var(--color-forest)]/8 to-[color:var(--color-moss)]/4'
    : accent === 'saffron'
      ? 'border-[color:var(--color-saffron)]/35 bg-[color:var(--color-saffron)]/8'
      : 'border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)]';
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink-soft)]/70">{label}</div>
      <div className="mt-1 font-serif text-[22px] leading-none">{value}</div>
    </div>
  );
}
