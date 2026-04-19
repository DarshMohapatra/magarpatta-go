'use client';

const CARDS = [
  {
    tag: 'Fresh out of the kadhai',
    title: 'Hot jalebi',
    shop: 'Kalika Sweets',
    price: '₹120',
    ago: 'just now',
    accent: 'saffron',
    eta: '18 min',
  },
  {
    tag: 'Ratnagiri lot in',
    title: 'Alphonso mangoes',
    shop: 'Destination Centre',
    price: '₹480 / dozen',
    ago: '8 min ago',
    accent: 'forest',
    eta: '22 min',
  },
  {
    tag: 'Still warm',
    title: 'Sourdough loaf',
    shop: "Baker's Basket",
    price: '₹220',
    ago: '22 min ago',
    accent: 'terracotta',
    eta: '25 min',
  },
];

const accent: Record<string, { bg: string; fg: string; dot: string }> = {
  saffron: {
    bg: 'bg-[color:var(--color-saffron)]/10',
    fg: 'text-[color:var(--color-saffron)]',
    dot: 'bg-[color:var(--color-saffron)]',
  },
  forest: {
    bg: 'bg-[color:var(--color-forest)]/10',
    fg: 'text-[color:var(--color-forest)]',
    dot: 'bg-[color:var(--color-forest)]',
  },
  terracotta: {
    bg: 'bg-[color:var(--color-terracotta)]/10',
    fg: 'text-[color:var(--color-terracotta)]',
    dot: 'bg-[color:var(--color-terracotta)]',
  },
};

export function HeroPreview() {
  return (
    <div className="relative h-[520px] w-full hidden lg:block">
      {/* Orbiting ring behind cards */}
      <svg
        aria-hidden
        viewBox="0 0 500 500"
        className="absolute inset-0 w-full h-full opacity-60 animate-float-slow"
      >
        <circle
          cx="250"
          cy="250"
          r="220"
          fill="none"
          stroke="var(--color-forest)"
          strokeOpacity="0.12"
          strokeDasharray="2 6"
        />
        <circle
          cx="250"
          cy="250"
          r="170"
          fill="none"
          stroke="var(--color-saffron)"
          strokeOpacity="0.2"
          strokeDasharray="1 4"
        />
        <circle cx="420" cy="160" r="3" fill="var(--color-saffron)" />
        <circle cx="110" cy="320" r="3" fill="var(--color-terracotta)" />
      </svg>

      {/* Floating ETA badge */}
      <div className="absolute top-2 right-8 z-20 rounded-full border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)]/90 backdrop-blur px-3 py-1.5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-forest)] pulse-ring" />
          <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]">
            Riders ready · 4 online
          </span>
        </div>
      </div>

      {/* Card 1 — top */}
      <article
        className="group absolute z-30 left-[8%] top-[6%] w-[300px] rotate-[-4deg] transition-all duration-500 hover:rotate-[-2deg] hover:-translate-y-1"
        style={{ boxShadow: '0 24px 60px -20px rgba(15,15,14,0.22)' }}
      >
        <Card c={CARDS[0]} />
      </article>

      {/* Card 2 — middle */}
      <article
        className="group absolute z-20 right-[4%] top-[32%] w-[290px] rotate-[3deg] transition-all duration-500 hover:rotate-[1deg] hover:-translate-y-1"
        style={{ boxShadow: '0 24px 60px -20px rgba(15,15,14,0.2)' }}
      >
        <Card c={CARDS[1]} />
      </article>

      {/* Card 3 — bottom */}
      <article
        className="group absolute z-10 left-[14%] bottom-[4%] w-[300px] rotate-[-2deg] transition-all duration-500 hover:rotate-[0deg] hover:-translate-y-1"
        style={{ boxShadow: '0 24px 60px -20px rgba(15,15,14,0.18)' }}
      >
        <Card c={CARDS[2]} />
      </article>
    </div>
  );
}

function Card({ c }: { c: (typeof CARDS)[number] }) {
  const a = accent[c.accent];
  return (
    <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] overflow-hidden">
      {/* Illustration panel */}
      <div className={`relative h-28 ${a.bg} border-b border-[color:var(--color-ink)]/8 overflow-hidden`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <Glyph accent={c.accent} />
        </div>
        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-paper)]/90 backdrop-blur px-2.5 py-1">
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${a.dot} ${a.fg} pulse-ring`} />
          <span className="text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]">
            {c.tag}
          </span>
        </div>
        <div className="absolute top-3 right-3 rounded-full bg-[color:var(--color-ink)] text-[color:var(--color-cream)] px-2.5 py-1 text-[10.5px] uppercase tracking-[0.12em]">
          {c.eta}
        </div>
      </div>

      <div className="px-5 py-4">
        <h3 className="font-serif text-[22px] leading-tight text-[color:var(--color-ink)]">
          {c.title}
        </h3>
        <p className="mt-0.5 text-[12.5px] text-[color:var(--color-ink-soft)]">{c.shop}</p>

        <div className="mt-4 flex items-baseline justify-between">
          <span className="font-serif text-[20px] text-[color:var(--color-forest)]">{c.price}</span>
          <span className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/70">
            {c.ago}
          </span>
        </div>
      </div>
    </div>
  );
}

function Glyph({ accent }: { accent: string }) {
  if (accent === 'saffron') {
    return (
      <svg width="68" height="68" viewBox="0 0 64 64" fill="none" className="text-[color:var(--color-saffron)] opacity-80">
        <path
          d="M32 8c3 5 8 7 8 14a8 8 0 0 1-16 0c0-5 2-7 4-11 1 2 2 3 3 5 0-3 1-5 1-8z"
          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
        />
        <path
          d="M20 36c-3 2-4 6-4 10 0 6 6 10 16 10s16-4 16-10c0-4-1-8-4-10"
          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
        />
        <circle cx="26" cy="46" r="1.5" fill="currentColor" />
        <circle cx="38" cy="48" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  if (accent === 'forest') {
    return (
      <svg width="68" height="68" viewBox="0 0 64 64" fill="none" className="text-[color:var(--color-forest)] opacity-80">
        <path
          d="M32 10c8 0 16 8 16 22s-8 22-16 22-16-8-16-22 8-22 16-22z"
          stroke="currentColor" strokeWidth="1.4"
        />
        <path d="M32 10c-3 4-4 8-4 12s1 8 4 12 4 8 4 12-1 8-4 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M22 14l4 6M42 14l-4 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="68" height="68" viewBox="0 0 64 64" fill="none" className="text-[color:var(--color-terracotta)] opacity-80">
      <ellipse cx="32" cy="36" rx="20" ry="14" stroke="currentColor" strokeWidth="1.4" />
      <path d="M18 28c0-4 6-8 14-8s14 4 14 8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M24 36l3-4M36 36l3-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
