import Link from 'next/link';
import { PartnerNav } from '@/components/partner/partner-nav';

export const dynamic = 'force-static';

const BENEFITS = [
  { title: '15–18% commission', body: 'Flat, printed. No hidden rank-boosts or ad placements to buy.' },
  { title: 'Daily settlement', body: 'Money in your bank by the next morning. UPI option for instant.' },
  { title: 'Run your kitchen', body: 'Accept, prep, mark ready — the queue respects your prep-time ETA.' },
  { title: 'Your delivery, your choice', body: 'Toggle self-delivery and keep the customer relationship directly.' },
  { title: 'Township-only reach', body: 'We never deliver outside Magarpatta. The customer is your neighbour.' },
  { title: 'MRP-compliant by design', body: 'Regulated goods list at MRP. No Legal Metrology surprises.' },
];

const STEPS = [
  { n: 1, title: 'Register your shop', body: 'Shop + KYC + payouts in 3 steps. Takes ~5 minutes.' },
  { n: 2, title: 'We verify on a WhatsApp call', body: 'FSSAI, GSTIN, bank — quick doc check. Usually under 24 hours.' },
  { n: 3, title: 'Go live + fill your menu', body: 'Your shop appears in the township app the moment you&apos;re approved.' },
  { n: 4, title: 'Accept your first order', body: 'Mobile-friendly order console; 5-second auto-refresh.' },
];

export default function VendorLanding() {
  return (
    <main className="relative min-h-screen">
      <PartnerNav />

      <section className="pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <div className="grid lg:grid-cols-[1.15fr_1fr] gap-14 items-center">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">For Magarpatta shops</div>
              <h1 className="mt-4 font-serif text-[44px] sm:text-[58px] lg:text-[72px] leading-[0.98] tracking-[-0.02em]">
                Put your counter on{' '}
                <span className="italic text-[color:var(--color-forest)]">Magarpatta Go.</span>
              </h1>
              <p className="mt-6 text-[15px] sm:text-[16.5px] leading-[1.55] text-[color:var(--color-ink-soft)] max-w-[540px]">
                Thirty-five thousand neighbours inside the gates. One app. Zero cross-city noise. Keep your
                margins, keep your voice, keep your kitchen yours.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/vendor/register" className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)] px-6 py-3.5 text-[14px] font-medium transition-colors">
                  Register your shop
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <Link href="/vendor/signin" className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-forest)]/30 text-[color:var(--color-forest)] hover:bg-[color:var(--color-forest)] hover:text-[color:var(--color-cream)] px-6 py-3.5 text-[14px] font-medium transition-colors">
                  Vendor sign in
                </Link>
              </div>
              <p className="mt-6 text-[12px] text-[color:var(--color-ink-soft)]/70">
                Existing partners: sign in with your owner phone + password.
              </p>
            </div>

            {/* Visual */}
            <div className="relative rounded-3xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6 sm:p-8 overflow-hidden">
              <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Today</div>
              <div className="mt-2 font-serif text-[40px] leading-none">₹12,480</div>
              <div className="mt-1 text-[12px] text-[color:var(--color-ink-soft)]/75">21 orders delivered · after 15% commission</div>

              <div className="mt-6 space-y-2.5">
                {[
                  { label: 'New · 3 waiting to accept', tone: 'saffron' },
                  { label: 'Preparing · 4 in kitchen', tone: 'forest' },
                  { label: 'Out for delivery · 2', tone: 'forest' },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between rounded-xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-cream)]/40 px-4 py-3">
                    <span className="text-[12.5px] text-[color:var(--color-ink)]">{r.label}</span>
                    <span className={`h-2 w-2 rounded-full ${r.tone === 'saffron' ? 'bg-[color:var(--color-saffron)] pulse-ring' : 'bg-[color:var(--color-forest)]'}`} />
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl bg-gradient-to-br from-[color:var(--color-forest)] to-[color:var(--color-moss)] text-[color:var(--color-cream)] p-4">
                <div className="text-[10.5px] uppercase tracking-[0.14em] opacity-80">Payout landing tomorrow</div>
                <div className="mt-1 font-serif text-[22px]">₹10,608</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits grid */}
      <section className="py-20 bg-[color:var(--color-paper)] border-y border-[color:var(--color-ink)]/8">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <div className="max-w-[640px]">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Why vendors choose us</div>
            <h2 className="mt-3 font-serif text-[36px] sm:text-[48px] leading-[1.02] tracking-[-0.02em]">
              Built to be <span className="italic text-[color:var(--color-forest)]">unfair</span> to the incumbents.
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

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <div className="max-w-[640px]">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">How onboarding works</div>
            <h2 className="mt-3 font-serif text-[36px] sm:text-[48px] leading-[1.02] tracking-[-0.02em]">
              Under 24 hours,{' '}
              <span className="italic text-[color:var(--color-forest)]">end to end.</span>
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

          <div className="mt-12 flex flex-wrap gap-3">
            <Link href="/vendor/register" className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-6 py-3.5 text-[14px] font-medium hover:bg-[color:var(--color-forest-dark)]">
              Start the application →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
