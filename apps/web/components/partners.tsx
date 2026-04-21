const PARTNERS = [
  'Destination Centre',
  'Kalika Sweets',
  'Magarpatta Pharmacy',
  'Shraddha Meats',
  'Starbucks · Seasons',
  "McDonald's · Seasons",
  'Coffee Bean & Tea Leaf',
  "Pop Tate's · Seasons",
  'Theobroma',
];

export function Partners() {
  return (
    <section id="partners" className="relative py-14 border-y border-[color:var(--color-ink)]/8 bg-[color:var(--color-cream-soft)]/60 overflow-hidden">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10 mb-6">
        <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-ink-soft)]/70">
          Sourced exclusively from local partners
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[color:var(--color-cream-soft)] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[color:var(--color-cream-soft)] to-transparent z-10 pointer-events-none" />

        <div className="overflow-hidden">
          <div className="flex items-center gap-14 whitespace-nowrap animate-marquee w-max">
            {[...PARTNERS, ...PARTNERS].map((p, i) => (
              <div key={`${p}-${i}`} className="flex items-center gap-4 shrink-0">
                <span className="font-serif italic text-[28px] lg:text-[32px] text-[color:var(--color-forest)]/85">
                  {p}
                </span>
                <span className="text-[color:var(--color-ink)]/25">·</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
