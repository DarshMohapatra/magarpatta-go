'use client';

import { useEffect, useState } from 'react';

const FRESH_ROTATION = [
  { where: 'Kalika Sweets',                       what: 'Hot jalebi',                ago: 'just now' },
  { where: 'Starbucks · Seasons',                 what: 'Single-origin pour-over',   ago: '6 min ago' },
  { where: 'Theobroma',                           what: 'Dutch truffle cake',        ago: '9 min ago' },
  { where: 'Destination Centre',                  what: 'Alphonso mangoes',          ago: '14 min ago' },
  { where: "Pop Tate's · Seasons",                what: 'Margherita · wood-fired',   ago: '18 min ago' },
  { where: 'Kalika Sweets',                       what: 'Kadhai samosa',             ago: '20 min ago' },
  { where: 'Magarpatta Pharmacy',                 what: 'Daily refills ready',       ago: 'standing by' },
];

export function LandingPulse() {
  const [time, setTime] = useState<string>('');
  const [rotationIdx, setRotationIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      );
    tick();
    const tId = setInterval(tick, 30_000);
    return () => clearInterval(tId);
  }, []);

  useEffect(() => {
    const rotId = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setRotationIdx((i) => (i + 1) % FRESH_ROTATION.length);
        setVisible(true);
      }, 280);
    }, 3600);
    return () => clearInterval(rotId);
  }, []);

  const drop = FRESH_ROTATION[rotationIdx];

  return (
    <div className="relative hidden lg:flex items-center justify-center w-full">
      {/* Soft radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(400px 400px at 50% 50%, rgba(212,132,61,0.08), transparent 70%)',
        }}
      />

      {/* Central stacked panel */}
      <div className="relative w-full max-w-[420px] animate-float-slow">
        {/* Map / polygon card */}
        <div className="relative rounded-3xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] shadow-[0_30px_80px_-30px_rgba(15,15,14,0.28)] overflow-hidden">
          <div className="relative h-[220px] bg-[color:var(--color-forest)]/4 overflow-hidden">
            {/* Geofence polygon */}
            <svg viewBox="0 0 400 280" className="absolute inset-0 w-full h-full">
              <defs>
                <radialGradient id="pulseGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--color-saffron)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--color-saffron)" stopOpacity="0" />
                </radialGradient>
              </defs>

              <circle cx="200" cy="140" r="110" fill="url(#pulseGrad)" />

              <path
                d="M90 120 L160 70 L280 75 L340 140 L335 220 L260 250 L140 240 L70 195 Z"
                stroke="var(--color-forest)"
                strokeWidth="1.2"
                strokeDasharray="3 4"
                fill="var(--color-forest)"
                fillOpacity="0.06"
              />

              {/* Rider dots */}
              <g>
                <circle cx="165" cy="140" r="4" fill="var(--color-saffron)" />
                <circle cx="165" cy="140" r="4" fill="var(--color-saffron)" opacity="0.35">
                  <animate attributeName="r" values="4;14;4" dur="2.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.35;0;0.35" dur="2.8s" repeatCount="indefinite" />
                </circle>
              </g>
              <g>
                <circle cx="240" cy="110" r="4" fill="var(--color-terracotta)" />
                <circle cx="240" cy="110" r="4" fill="var(--color-terracotta)" opacity="0.35">
                  <animate attributeName="r" values="4;14;4" dur="2.8s" begin="0.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.35;0;0.35" dur="2.8s" begin="0.6s" repeatCount="indefinite" />
                </circle>
              </g>
              <g>
                <circle cx="220" cy="200" r="4" fill="var(--color-forest)" />
                <circle cx="220" cy="200" r="4" fill="var(--color-forest)" opacity="0.35">
                  <animate attributeName="r" values="4;14;4" dur="2.8s" begin="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.35;0;0.35" dur="2.8s" begin="1.2s" repeatCount="indefinite" />
                </circle>
              </g>
              <g>
                <circle cx="150" cy="200" r="4" fill="var(--color-saffron)" />
                <circle cx="150" cy="200" r="4" fill="var(--color-saffron)" opacity="0.35">
                  <animate attributeName="r" values="4;14;4" dur="2.8s" begin="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.35;0;0.35" dur="2.8s" begin="1.8s" repeatCount="indefinite" />
                </circle>
              </g>

              {/* Destination marker */}
              <g>
                <circle cx="200" cy="140" r="5" fill="var(--color-ink)" />
                <circle cx="200" cy="140" r="9" stroke="var(--color-ink)" strokeWidth="1.2" fill="none" />
              </g>
            </svg>

            {/* Floating badge over the map */}
            <div className="absolute top-3 left-3 rounded-full bg-[color:var(--color-paper)]/95 backdrop-blur px-3 py-1.5 inline-flex items-center gap-1.5 border border-[color:var(--color-ink)]/10">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-forest)] pulse-ring" />
              <span className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]">
                Live · Magarpatta
              </span>
            </div>

            <div className="absolute top-3 right-3 rounded-full bg-[color:var(--color-ink)] text-[color:var(--color-cream)] px-2.5 py-1 text-[10.5px] uppercase tracking-[0.12em]">
              {time || '—'}
            </div>
          </div>

          {/* Status rows */}
          <div className="divide-y divide-[color:var(--color-ink)]/8">
            <div className="flex items-center justify-between px-5 py-3.5">
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/65">
                  On duty
                </div>
                <div className="mt-0.5 font-serif text-[22px] leading-none text-[color:var(--color-forest)]">
                  4 riders
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/65">
                  Median today
                </div>
                <div className="mt-0.5 font-serif text-[22px] leading-none text-[color:var(--color-forest)]">
                  22 min
                </div>
              </div>
            </div>

            <div className={`flex items-start gap-3 px-5 py-4 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-saffron)]/15 text-[color:var(--color-saffron)]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1c2 3 4 4 4 7a4 4 0 0 1-8 0c0-2 1-3 2-5 1 1 1.5 2 2 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-serif text-[18px] leading-tight text-[color:var(--color-ink)] truncate">
                    {drop.what}
                  </p>
                  <span className="shrink-0 text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/60">
                    {drop.ago}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-[color:var(--color-ink-soft)]">
                  from <span className="text-[color:var(--color-forest)]">{drop.where}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Caption beneath */}
        <p className="mt-5 text-center text-[11.5px] uppercase tracking-[0.16em] text-[color:var(--color-ink-soft)]/60">
          A postcode-sized operation · live feed
        </p>
      </div>
    </div>
  );
}
