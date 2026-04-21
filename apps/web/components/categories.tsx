const CATS = [
  {
    title: 'Food & Dining',
    desc: 'Fresh from Kalika Sweets, Seasons Mall kitchens, and your favourite Magarpatta cafés.',
    tag: '40+ kitchens',
    tone: 'forest',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M5 11c0-3.3 4-6 9-6s9 2.7 9 6H5zM5 11h18v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V11z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 5V3M10 16v3M14 16v3M18 16v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: 'Groceries',
    desc: 'Destination Centre shelves, brought to your door at MRP + transparent platform fee.',
    tag: 'Live stock',
    tone: 'saffron',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M4 6h3l2 12h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="11" cy="22" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="20" cy="22" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M9 10h15l-1.5 7H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: 'Medicines',
    desc: 'Prescription refills with a registered Magarpatta pharmacist. Reminders built in.',
    tag: 'Rx verified',
    tone: 'terracotta',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="5" y="9" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M14 13v6M11 16h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M9 9V6a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v3" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    title: 'Fresh Meat',
    desc: 'Cut-to-order from Shraddha Meats. Halal & jhatka clearly labelled. Chill-chain maintained.',
    tag: 'Chill chain',
    tone: 'forest',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M7 15a6 6 0 0 1 12 0v4H7v-4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M11 19v4M17 19v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="13" cy="12" r="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    title: 'Daily Essentials',
    desc: 'Batteries, stationery, bathroom repairs, the odd umbrella. The stuff you actually run out of.',
    tag: 'Concierge',
    tone: 'saffron',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M4 8l10-5 10 5v12l-10 5-10-5V8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M4 8l10 5 10-5M14 13v12" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    title: 'Running to Seasons',
    desc: 'Tap once — we pick up literally any in-stock item from the mall within 25 min. Flat ₹49.',
    tag: 'Concierge',
    tone: 'terracotta',
    featured: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M5 14h18M5 14l4-6h10l4 6M5 14v8h18v-8" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M11 18h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const toneClasses: Record<string, { bg: string; text: string; border: string }> = {
  forest: {
    bg: 'bg-[color:var(--color-forest)]',
    text: 'text-[color:var(--color-cream)]',
    border: 'border-[color:var(--color-forest)]',
  },
  saffron: {
    bg: 'bg-[color:var(--color-saffron)]',
    text: 'text-[color:var(--color-ink)]',
    border: 'border-[color:var(--color-saffron)]',
  },
  terracotta: {
    bg: 'bg-[color:var(--color-terracotta)]',
    text: 'text-[color:var(--color-cream)]',
    border: 'border-[color:var(--color-terracotta)]',
  },
};

import Link from 'next/link';

export function Categories() {
  return (
    <section id="menu" className="py-24 lg:py-32 bg-[color:var(--color-cream-soft)]/50 border-y border-[color:var(--color-ink)]/8">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div className="max-w-2xl">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">
              What you can order
            </div>
            <h2 className="mt-4 font-serif text-[44px] lg:text-[56px] leading-[0.98] tracking-[-0.02em]">
              Everything Magarpatta <span className="italic text-[color:var(--color-forest)]">already has.</span>
            </h2>
          </div>
          <p className="max-w-md text-[15px] leading-[1.6] text-[color:var(--color-ink-soft)]">
            Six categories, one fleet of four neighbours. Nothing shipped from a warehouse outside
            the township. Nothing you couldn&apos;t walk down and get — if you weren&apos;t juggling work, kids, and a weather forecast.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {CATS.map((c) => {
            const t = toneClasses[c.tone];
            return (
              <article
                key={c.title}
                className={`group relative overflow-hidden rounded-3xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-7 lg:p-8 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(15,15,14,0.25)] ${
                  c.featured ? 'sm:col-span-2 lg:col-span-1 lg:row-span-1' : ''
                }`}
              >
                <div className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl ${t.bg} ${t.text}`}>
                  {c.icon}
                </div>

                <h3 className="mt-6 font-serif text-[30px] leading-tight text-[color:var(--color-ink)]">
                  {c.title}
                </h3>
                <p className="mt-3 text-[14.5px] leading-[1.6] text-[color:var(--color-ink-soft)]">
                  {c.desc}
                </p>

                <div className="mt-6 flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/70">
                    {c.tag}
                  </span>
                  <Link href="/menu" className="inline-flex items-center gap-1 text-[13px] font-medium text-[color:var(--color-forest)] group-hover:translate-x-1 transition-transform">
                    Browse
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
