'use client';

import { useEffect, useState } from 'react';

const DROPS = [
  { where: 'Kalika Sweets', what: 'Hot jalebi', when: 'just now', tag: 'sweets' },
  { where: 'The Baker\'s Basket', what: 'Sourdough loaves', when: '6 min ago', tag: 'bakery' },
  { where: 'Destination Centre', what: 'Alphonso mangoes, Ratnagiri', when: '12 min ago', tag: 'fruit' },
  { where: 'Shraddha Meats', what: 'Cut-to-order chicken', when: '18 min ago', tag: 'meat' },
  { where: 'Seasons Mall — Starbucks', what: 'Batch brew, medium roast', when: '22 min ago', tag: 'coffee' },
  { where: 'Kalika Sweets', what: 'Samosa (kadhai fresh)', when: '28 min ago', tag: 'sweets' },
];

export function FreshDrops() {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      );
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20 items-start">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">
              Fresh drops · live
            </div>
            <h2 className="mt-4 font-serif text-[44px] lg:text-[56px] leading-[0.98] tracking-[-0.02em]">
              What&apos;s <span className="italic text-[color:var(--color-forest)]">out of the kadhai</span>, right now.
            </h2>
            <p className="mt-6 text-[15px] leading-[1.6] text-[color:var(--color-ink-soft)] max-w-md">
              We live-feed fresh-batch notifications from our partner counters. The hot jalebi you used to time your evening walk around — now on your screen.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/80">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--color-terracotta)] text-[color:var(--color-terracotta)] pulse-ring" />
              Magarpatta time · {time || '—'}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] shadow-[0_24px_60px_-28px_rgba(15,15,14,0.2)] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--color-ink)]/8 bg-[color:var(--color-cream)]/50">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-terracotta)]/50" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-saffron)]/50" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-forest)]/50" />
                  </div>
                  <span className="ml-3 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/70">
                    Live feed
                  </span>
                </div>
                <span className="text-[11px] text-[color:var(--color-ink-soft)]/60">Auto-refresh · 10s</span>
              </div>

              <ul>
                {DROPS.map((d, i) => (
                  <li
                    key={`${d.where}-${i}`}
                    className="flex items-start gap-4 px-6 py-4 border-b last:border-b-0 border-[color:var(--color-ink)]/6 hover:bg-[color:var(--color-cream)]/40 transition-colors"
                  >
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-saffron)]/15 text-[color:var(--color-saffron)]">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                          d="M7 1c2 3 4 4 4 7a4 4 0 0 1-8 0c0-2 1-3 2-5 1 1 1.5 2 2 3"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-serif text-[20px] leading-tight text-[color:var(--color-ink)] truncate">
                          {d.what}
                        </p>
                        <span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/60">
                          {d.when}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] text-[color:var(--color-ink-soft)]">
                        from <span className="text-[color:var(--color-forest)]">{d.where}</span>
                      </p>
                    </div>
                    <button className="shrink-0 mt-1.5 text-[12px] font-medium text-[color:var(--color-forest)] hover:underline underline-offset-4">
                      Add to cart
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
