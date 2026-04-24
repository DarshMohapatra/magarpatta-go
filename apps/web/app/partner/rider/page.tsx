import Link from 'next/link';
import { PartnerNav } from '@/components/partner/partner-nav';

export const dynamic = 'force-static';

const BENEFITS = [
  { title: '₹30 per drop · flat', body: 'No surge roulette. Every delivered order pays the same.' },
  { title: 'Walk / cycle / scooter', body: 'All three work. Magarpatta is 400 acres. Nobody is going far.' },
  { title: 'Peak 2 hours a day', body: 'Lunch + dinner push. Do a few drops between classes or errands.' },
  { title: 'Weekly payouts', body: 'Money in your bank every Monday. No waiting cycle, no deductions.' },
  { title: 'OTP-verified drop', body: 'Customer reads a 4-digit code. No disputes about "who got it".' },
  { title: 'Four slots, first-come', body: 'Phase 1 roster is small on purpose. You&apos;ll know who&apos;s on shift.' },
];

const STEPS = [
  { n: 1, title: 'Tell us who you are', body: 'Name, phone, DL / Aadhaar numbers, vehicle plate.' },
  { n: 2, title: 'Quick verification', body: 'Ops calls you; we check DL + RC in person. 15 minutes.' },
  { n: 3, title: 'Onboarding kit', body: 'Magarpatta Go delivery bag + helmet sticker. Yours to keep.' },
  { n: 4, title: 'First shift', body: 'Sign in at /rider, go on-duty, claim your first order.' },
];

export default function RiderLanding() {
  return (
    <main className="relative min-h-screen">
      <PartnerNav />

      <section className="pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <div className="grid lg:grid-cols-[1.15fr_1fr] gap-14 items-center">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-forest)]">For delivery partners</div>
              <h1 className="mt-4 font-serif text-[44px] sm:text-[58px] lg:text-[72px] leading-[0.98] tracking-[-0.02em]">
                Deliver to{' '}
                <span className="italic text-[color:var(--color-forest)]">neighbours.</span>
              </h1>
              <p className="mt-6 text-[15px] sm:text-[16.5px] leading-[1.55] text-[color:var(--color-ink-soft)] max-w-[540px]">
                No cross-city grind. Pick up from the hub, drop inside the gates. Flat ₹30 a drop and a proper
                tip on top if the customer likes your vibe. Magarpatta Go riders are neighbours first.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/rider/register" className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)] px-6 py-3.5 text-[14px] font-medium transition-colors">
                  Apply to ride
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <Link href="/rider/signin" className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-forest)]/30 text-[color:var(--color-forest)] hover:bg-[color:var(--color-forest)] hover:text-[color:var(--color-cream)] px-6 py-3.5 text-[14px] font-medium transition-colors">
                  Rider sign in
                </Link>
              </div>
              <p className="mt-6 text-[12px] text-[color:var(--color-ink-soft)]/70">
                Already approved? Sign in with your 10-digit phone.
              </p>
            </div>

            {/* Earnings card mock */}
            <div className="relative rounded-3xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6 sm:p-8 overflow-hidden">
              <div className="rounded-2xl bg-gradient-to-br from-[color:var(--color-forest)] to-[color:var(--color-moss)] text-[color:var(--color-cream)] p-5 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10.5px] uppercase tracking-[0.14em] opacity-80">Today</div>
                  <div className="mt-1 font-serif text-[34px] leading-none">₹450</div>
                  <div className="mt-1 text-[12.5px] opacity-85">15 drops · ₹30 per delivery</div>
                </div>
                <div className="text-right text-[11px] uppercase tracking-[0.14em] opacity-80">
                  On shift
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-[color:var(--color-ink)]/10 p-4">
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">Available now</div>
                <div className="mt-2 font-medium text-[13px]">Kalika Sweets → Aspen 4-B</div>
                <div className="text-[11.5px] text-[color:var(--color-ink-soft)]/75">2 kaju katli · 1 hot jalebi</div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-4 py-1.5 text-[12px] font-medium">
                    Accept order →
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[color:var(--color-paper)] border-y border-[color:var(--color-ink)]/8">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <div className="max-w-[640px]">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-forest)]">Why ride with us</div>
            <h2 className="mt-3 font-serif text-[36px] sm:text-[48px] leading-[1.02] tracking-[-0.02em]">
              Small radius.{' '}
              <span className="italic text-[color:var(--color-forest)]">Real earnings.</span>
            </h2>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-cream)]/60 p-6">
                <h3 className="font-serif text-[20px] leading-tight">{b.title}</h3>
                <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)] leading-[1.55]">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <div className="max-w-[640px]">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-forest)]">Getting on the roster</div>
            <h2 className="mt-3 font-serif text-[36px] sm:text-[48px] leading-[1.02] tracking-[-0.02em]">
              Four steps.{' '}
              <span className="italic text-[color:var(--color-forest)]">Same day.</span>
            </h2>
          </div>
          <ol className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6">
                <div className="h-8 w-8 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] flex items-center justify-center font-serif text-[15px]">
                  {s.n}
                </div>
                <h3 className="mt-4 font-serif text-[18px] leading-tight">{s.title}</h3>
                <p className="mt-2 text-[12.5px] text-[color:var(--color-ink-soft)] leading-[1.55]">{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12">
            <Link href="/rider/register" className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-6 py-3.5 text-[14px] font-medium hover:bg-[color:var(--color-forest-dark)]">
              Apply to ride →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
