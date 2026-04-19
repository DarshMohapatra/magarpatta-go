const POINTS = [
  {
    title: 'We live here too',
    body: 'Our four riders aren\'t gig workers from another neighbourhood. They are Magarpatta residents. They know which lift in Cosmos is slow, which gate to use after 9 PM, and which building has the hardest-to-find flat numbers.',
  },
  {
    title: 'Transparent pricing, always',
    body: 'MRP-regulated packaged goods are sold at MRP — full stop. Only non-MRP items (prepared food, loose goods, fresh cuts) carry our modest ₹1 hyper-local markup. You\'ll see every line item before you pay.',
  },
  {
    title: 'Gate-pass, auto-issued',
    body: 'We integrate with MyGate and NoBrokerHood. The moment you place an order, your rider\'s gate pass is pre-approved. Zero awkward five-minute waits at the security desk.',
  },
  {
    title: 'Lift-aware ETAs',
    body: 'Our ETA model knows Aspen has three working lifts and Cosmos has one slow one. We don\'t promise you 12 minutes and then take 22.',
  },
  {
    title: 'Tower-level group orders',
    body: '"Society Cart" pools neighbours\' orders into a single lobby drop. Cheaper for you, faster for us, less packaging for everyone.',
  },
  {
    title: 'Veg / Jain / Satvik first',
    body: 'Not a tag buried in filters. A first-class switch in the UI. We\'re built for the dietary reality of Magarpatta, not force-fitted from Bengaluru defaults.',
  },
];

export function WhyMagarpatta() {
  return (
    <section id="why" className="relative py-24 lg:py-32 bg-[color:var(--color-forest)] text-[color:var(--color-cream)] overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 10%, var(--color-saffron), transparent 50%), radial-gradient(circle at 80% 90%, var(--color-terracotta), transparent 50%)',
        }}
      />

      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">
            Why us · not them
          </div>
          <h2 className="mt-4 font-serif text-[44px] lg:text-[64px] leading-[0.98] tracking-[-0.02em]">
            Zomato delivers to Magarpatta.
            <br />
            <span className="italic text-[color:var(--color-saffron-soft)]">We deliver for it.</span>
          </h2>
          <p className="mt-6 text-[16px] leading-[1.6] text-[color:var(--color-cream)]/75 max-w-xl">
            A 400-acre township doesn&apos;t need a national-scale app. It needs a deliberately smaller,
            sharper operation — one that understands its own postcode.
          </p>
        </div>

        <div className="mt-16 grid md:grid-cols-2 gap-x-16 gap-y-12">
          {POINTS.map((p, i) => (
            <div key={p.title} className="relative">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="font-serif text-[14px] text-[color:var(--color-saffron)]/80">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-serif text-[26px] leading-tight text-[color:var(--color-cream)]">
                  {p.title}
                </h3>
              </div>
              <p className="text-[14.5px] leading-[1.65] text-[color:var(--color-cream)]/70 max-w-md">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
