import Link from 'next/link';
import { PartnerNav } from '@/components/partner/partner-nav';
import { siteConfig } from '@/lib/site-config';

export const dynamic = 'force-static';

const TILES = [
  {
    href: '/partner/vendor',
    kicker: 'For shops',
    title: `Sell on ${siteConfig.platformName}`,
    body: 'Run your counter, accept orders, manage inventory, and get paid daily — without Swiggy-scale fees.',
    cta: 'Vendor workspace →',
    accent: 'saffron',
  },
  {
    href: '/partner/rider',
    kicker: 'For riders',
    title: 'Earn as a neighbour',
    body: `Deliver within ${siteConfig.siteName} on your own time. Four slots, flat per-drop payout, no surge games.`,
    cta: 'Rider app →',
    accent: 'primary',
  },
  {
    href: '/partner/admin',
    kicker: 'For operations',
    title: 'Operations console',
    body: 'Approve vendors and riders, watch the live board, reconcile payouts. Internal access only.',
    cta: 'Admin console →',
    accent: 'accent',
  },
];

export default function PartnerIndex() {
  return (
    <main className="font-display relative min-h-screen bg-[color:var(--color-background)]">
      <PartnerNav />
      <section className="pt-28 pb-20 sm:pt-36">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          {/* Gradient-warm hero — partner parity with the rest of the system */}
          <div className="relative overflow-hidden rounded-[var(--radius-2xl)] gradient-warm text-white p-7 sm:p-10 shadow-[var(--shadow-glow)] max-w-[820px]">
            <div className="absolute -top-12 -right-12 h-52 w-52 rounded-full bg-white/15 blur-3xl" />
            <div className="absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="text-[10.5px] uppercase tracking-[0.18em] font-semibold opacity-90">
                Partner with us
              </div>
              <h1 className="mt-3 font-display text-[36px] sm:text-[48px] lg:text-[56px] leading-tight tracking-tight">
                Built by the township, for the township.
              </h1>
              <p className="mt-4 text-[14px] sm:text-[15px] opacity-90 max-w-[600px]">
                {siteConfig.platformName} runs on three roles working together — the shops that make
                what you love, the neighbours who deliver it, and the small ops team that keeps it honest.
                Pick yours below.
              </p>
            </div>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {TILES.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="group relative overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--color-border)]/60 bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-elev)] hover:border-[color:var(--color-primary)]/30 transition-all duration-200"
              >
                <div
                  className={`text-[10.5px] uppercase tracking-[0.16em] font-semibold ${
                    t.accent === 'saffron'
                      ? 'text-[color:var(--color-saffron)]'
                      : t.accent === 'primary'
                        ? 'text-[color:var(--color-primary)]'
                        : 'text-[color:var(--color-accent)]'
                  }`}
                >
                  {t.kicker}
                </div>
                <h2 className="mt-3 font-display text-[24px] font-bold leading-tight tracking-tight">
                  {t.title}
                </h2>
                <p className="mt-2 text-[13px] leading-[1.55] text-[color:var(--color-muted)]">
                  {t.body}
                </p>
                <div className="mt-5 text-[12.5px] font-semibold text-[color:var(--color-primary)] group-hover:translate-x-0.5 transition-transform">
                  {t.cta}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
