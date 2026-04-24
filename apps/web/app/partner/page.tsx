import Link from 'next/link';
import { PartnerNav } from '@/components/partner/partner-nav';

export const dynamic = 'force-static';

const TILES = [
  {
    href: '/partner/vendor',
    kicker: 'For shops',
    title: 'Sell on Magarpatta Go',
    body: 'Run your counter, accept orders, manage inventory, and get paid daily — without Swiggy-scale fees.',
    cta: 'Vendor workspace →',
    accent: 'saffron',
  },
  {
    href: '/partner/rider',
    kicker: 'For riders',
    title: 'Earn as a neighbour',
    body: 'Deliver within Magarpatta on your own time. Four slots, flat per-drop payout, no surge games.',
    cta: 'Rider app →',
    accent: 'forest',
  },
  {
    href: '/partner/admin',
    kicker: 'For operations',
    title: 'Operations console',
    body: 'Approve vendors and riders, watch the live board, reconcile payouts. Internal access only.',
    cta: 'Admin console →',
    accent: 'terracotta',
  },
];

export default function PartnerIndex() {
  return (
    <main className="relative min-h-screen">
      <PartnerNav />
      <section className="pt-36 pb-20 sm:pt-44">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <div className="max-w-[760px]">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Partner with us</div>
            <h1 className="mt-4 font-serif text-[48px] sm:text-[64px] lg:text-[76px] leading-[0.98] tracking-[-0.02em]">
              Built by the township,{' '}
              <span className="italic text-[color:var(--color-forest)]">for the township.</span>
            </h1>
            <p className="mt-6 text-[15px] sm:text-[16.5px] leading-[1.55] text-[color:var(--color-ink-soft)] max-w-[620px]">
              Magarpatta Go runs on three roles working together — the shops that make what you love, the
              neighbours who deliver it, and the small ops team that keeps it honest. Pick yours below.
            </p>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-5">
            {TILES.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="group relative overflow-hidden rounded-3xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-7 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-24px_rgba(15,15,14,0.18)] transition-all duration-300"
              >
                <div className={`text-[11px] uppercase tracking-[0.16em] ${
                  t.accent === 'saffron' ? 'text-[color:var(--color-saffron)]' :
                  t.accent === 'forest' ? 'text-[color:var(--color-forest)]' :
                  'text-[color:var(--color-terracotta)]'
                }`}>
                  {t.kicker}
                </div>
                <h2 className="mt-3 font-serif text-[28px] leading-[1.05] tracking-[-0.01em]">{t.title}</h2>
                <p className="mt-3 text-[13.5px] leading-[1.6] text-[color:var(--color-ink-soft)]">{t.body}</p>
                <div className="mt-6 text-[13px] font-medium text-[color:var(--color-forest)] group-hover:translate-x-0.5 transition-transform">
                  {t.cta}
                </div>
                <div
                  className="absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: t.accent === 'saffron'
                      ? 'radial-gradient(circle, var(--color-saffron)/20%, transparent 70%)'
                      : t.accent === 'forest'
                      ? 'radial-gradient(circle, var(--color-forest)/15%, transparent 70%)'
                      : 'radial-gradient(circle, var(--color-terracotta)/15%, transparent 70%)',
                  }}
                />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
