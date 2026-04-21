import { TowerSelect } from './tower-select';
import { HeroPreview } from './hero-preview';

export function Hero() {
  return (
    <section className="relative pt-36 pb-20 lg:pt-44 lg:pb-28 overflow-hidden">
      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-16 items-start">
          {/* Left — content */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)]/60 backdrop-blur-sm px-3 py-1.5">
              <span className="relative inline-flex h-1.5 w-1.5 items-center justify-center rounded-full bg-[color:var(--color-saffron)] text-[color:var(--color-saffron)] pulse-ring" />
              <span className="text-[11px] tracking-[0.16em] uppercase text-[color:var(--color-ink-soft)]">
                Magarpatta City · Pune
              </span>
            </div>

            <h1 className="mt-7 font-serif text-[52px] sm:text-[68px] lg:text-[84px] leading-[0.96] tracking-[-0.02em] text-[color:var(--color-ink)]">
              Daily delights,
              <br />
              <span className="italic text-[color:var(--color-forest)]">delivered within</span>
              <br />
              your township.
            </h1>

            <p className="mt-6 max-w-xl text-[16px] lg:text-[17px] leading-[1.55] text-[color:var(--color-ink-soft)]">
              Food, groceries, medicines, fresh meat and daily essentials — sourced only from
              within Magarpatta and delivered in under 25 minutes. By neighbours, for neighbours.
              Four riders. Sixteen societies. Two hundred and fifty-nine buildings. Zero borders
              crossed.
            </p>

            <div className="mt-8 lg:mt-10">
              <TowerSelect />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  href="/menu"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-medium bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)] transition-colors"
                >
                  Browse the menu
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <a
                  href="/signup"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-medium border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] text-[color:var(--color-ink)] hover:border-[color:var(--color-forest)]/40 transition-colors"
                >
                  Create an account
                </a>
                <span className="text-[12px] text-[color:var(--color-ink-soft)]/70">56 items live · 16 societies</span>
              </div>
              <p className="mt-4 text-[12.5px] text-[color:var(--color-ink-soft)]/70 max-w-xl">
                We deliver <span className="font-medium text-[color:var(--color-ink)]">only</span>{' '}
                inside Magarpatta City. Addresses outside the geofence are politely declined.
              </p>
            </div>
          </div>

          {/* Right — floating preview stack */}
          <HeroPreview />
        </div>

        {/* Stats strip */}
        <div className="mt-16 lg:mt-20 grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-10 pt-8 border-t border-[color:var(--color-ink)]/10">
          {[
            { v: '16', l: 'societies mapped' },
            { v: '259', l: 'buildings · Magarpatta' },
            { v: '25', l: 'min median delivery' },
            { v: '8', l: 'partner shops' },
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
  );
}
