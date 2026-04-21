import Link from 'next/link';
import { NavbarWithSession } from '@/components/navbar-with-session';
import { CartDrawer } from '@/components/cart-drawer';
import { LandingPulse } from '@/components/landing-pulse';
import { prisma } from '@/lib/prisma';

export const metadata = {
  title: 'Magarpatta Go — Daily delights, delivered within your township',
  description:
    'Hyper-local delivery inside Magarpatta City, Pune. Food, groceries, medicines, fresh meat. Under 25 minutes. By neighbours, for neighbours.',
};

export const dynamic = 'force-dynamic';

export default async function Landing() {
  const [itemCount, vendorCount, societyCount] = await Promise.all([
    prisma.product.count({ where: { inStock: true } }),
    prisma.vendor.count({ where: { active: true } }),
    prisma.society.count(),
  ]);

  return (
    <main className="relative z-10 min-h-screen flex flex-col">
      <NavbarWithSession />

      {/* Hero — single-screen, centred, editorial */}
      <section className="relative flex-1 flex items-center overflow-hidden pt-24 pb-20">
        {/* Decorative geofence polygon — subtle */}
        <svg
          aria-hidden
          className="absolute -right-44 -top-10 w-[720px] opacity-[0.07] animate-float-slow pointer-events-none"
          viewBox="0 0 600 600"
          fill="none"
        >
          <path
            d="M120 180 L240 80 L420 90 L530 200 L540 360 L460 500 L280 530 L130 460 L70 300 Z"
            stroke="var(--color-forest)"
            strokeWidth="1.2"
            fill="var(--color-forest)"
            fillOpacity="0.06"
          />
          <circle cx="300" cy="300" r="5" fill="var(--color-saffron)" />
        </svg>

        <svg
          aria-hidden
          className="absolute -left-32 bottom-10 w-[560px] opacity-[0.05] pointer-events-none"
          viewBox="0 0 600 600"
          fill="none"
        >
          <circle cx="300" cy="300" r="260" stroke="var(--color-forest)" strokeWidth="1" strokeDasharray="2 6" />
          <circle cx="300" cy="300" r="200" stroke="var(--color-saffron)" strokeWidth="1" strokeDasharray="1 4" />
        </svg>

        <div className="relative mx-auto max-w-[1280px] w-full px-6 lg:px-10">
          <div className="grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-16 items-center">
            {/* Left — editorial content */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)]/60 backdrop-blur-sm px-3 py-1.5">
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--color-saffron)] text-[color:var(--color-saffron)] pulse-ring" />
                <span className="text-[11px] tracking-[0.16em] uppercase text-[color:var(--color-ink-soft)]">
                  Magarpatta City · Pune · est. 2026
                </span>
              </div>

              <h1 className="mt-8 font-serif text-[52px] sm:text-[72px] lg:text-[92px] leading-[0.94] tracking-[-0.025em] text-[color:var(--color-ink)]">
                A shop that
                <br />
                <span className="italic text-[color:var(--color-forest)]">delivers.</span>
                <br />
                Nothing more.
              </h1>

              <p className="mt-7 max-w-xl text-[16px] lg:text-[18px] leading-[1.5] text-[color:var(--color-ink-soft)]">
                Food, groceries, medicines, fresh meat — sourced only from within Magarpatta and
                delivered in under twenty-five minutes. By neighbours, for neighbours.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/menu"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[14.5px] font-medium bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)] transition-colors"
                >
                  Browse the menu
                  <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[14.5px] font-medium border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] text-[color:var(--color-ink)] hover:border-[color:var(--color-forest)]/40 transition-colors"
                >
                  Create an account
                </Link>
              </div>

              <Link
                href="/home"
                className="inline-block mt-5 text-[13.5px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)] underline underline-offset-4"
              >
                Or see how it works →
              </Link>
            </div>

            {/* Right — live status pulse */}
            <LandingPulse />
          </div>

          {/* Thin stat strip */}
          <div className="mt-20 lg:mt-24 grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-10 pt-8 border-t border-[color:var(--color-ink)]/10">
            {[
              { v: String(societyCount), l: 'societies mapped' },
              { v: '25', l: 'min median delivery' },
              { v: String(vendorCount), l: 'partner shops' },
              { v: String(itemCount), l: 'items live' },
            ].map((s) => (
              <div key={s.l}>
                <div className="font-serif text-5xl lg:text-[56px] leading-none text-[color:var(--color-forest)]">
                  {s.v}
                </div>
                <div className="mt-2 text-[12px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/80">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing note — editorial, minimal */}
      <section className="relative border-t border-[color:var(--color-ink)]/10 bg-[color:var(--color-cream-soft)]/50 py-20 lg:py-28">
        <div className="relative mx-auto max-w-[1080px] px-6 lg:px-10">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-saffron)] mb-6">
            A note from the founders
          </div>
          <p className="font-serif text-[32px] lg:text-[44px] leading-[1.12] tracking-[-0.015em] max-w-3xl">
            If you&rsquo;re reading this from inside the gates —{' '}
            <span className="italic text-[color:var(--color-forest)]">hello.</span>{' '}
            We built this for you. Not for anyone else.
          </p>
          <p className="mt-6 max-w-2xl text-[14.5px] leading-[1.6] text-[color:var(--color-ink-soft)]">
            No app stores, no billboards, no Bengaluru defaults. Four riders, one postcode, a
            single afternoon to get to know which lift in Cosmos is slow and which dal at Kalika
            sells out by 8 PM.
          </p>
          <p className="mt-8 text-[12px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">
            — The team, Magarpatta Go · launching 2026
          </p>
        </div>
      </section>

      {/* Minimal footer */}
      <footer className="border-t border-[color:var(--color-ink)]/10 bg-[color:var(--color-cream)] py-10">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-saffron)]" />
            <span className="text-[14px] tracking-tight font-medium">
              Magarpatta <span className="font-serif italic text-[color:var(--color-forest)]">Go</span>
            </span>
          </div>
          <nav className="flex items-center gap-6 text-[13px] text-[color:var(--color-ink-soft)]">
            <Link href="/menu" className="hover:text-[color:var(--color-forest)]">Menu</Link>
            <Link href="/home" className="hover:text-[color:var(--color-forest)]">How it works</Link>
            <Link href="/signin" className="hover:text-[color:var(--color-forest)]">Sign in</Link>
            <Link href="/signup" className="hover:text-[color:var(--color-forest)]">Create account</Link>
          </nav>
          <div className="text-[12px] text-[color:var(--color-ink-soft)]/60">
            © 2026 · Made in Magarpatta
          </div>
        </div>
      </footer>

      <CartDrawer />
    </main>
  );
}
