const STEPS = [
  {
    n: '01',
    title: 'Pick your tower',
    desc: 'Select from our curated list of 120 Magarpatta towers. If you\'re outside the gates, we\'ll respectfully ask you to wait — we\'re not a generalist, we\'re your neighbour.',
  },
  {
    n: '02',
    title: 'Browse hyper-local',
    desc: 'Only products genuinely stocked at Destination Centre, Seasons Mall or Kalika Sweets right now. Live inventory, not a stale catalogue.',
  },
  {
    n: '03',
    title: 'Delivered in 25 min',
    desc: 'One of our four riders — your actual neighbour — picks up, brings it up the lift, hands it over. OTP + photo proof. Done.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-24 lg:py-32">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">
            How it works
          </div>
          <h2 className="mt-4 font-serif text-[44px] lg:text-[56px] leading-[0.98] tracking-[-0.02em] text-[color:var(--color-ink)]">
            Three steps. <span className="italic text-[color:var(--color-forest)]">Nothing more.</span>
          </h2>
        </div>

        <div className="mt-14 lg:mt-20 grid md:grid-cols-3 gap-8 lg:gap-12">
          {STEPS.map((s, idx) => (
            <div key={s.n} className="relative group">
              {idx < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-6 left-[calc(100%-2rem)] right-0 h-px bg-gradient-to-r from-[color:var(--color-ink)]/20 to-transparent" />
              )}

              <div className="flex items-baseline gap-4">
                <span className="font-serif text-[44px] text-[color:var(--color-saffron)] leading-none">
                  {s.n}
                </span>
                <div className="h-px flex-1 bg-[color:var(--color-ink)]/10 translate-y-[-8px]" />
              </div>

              <h3 className="mt-6 font-serif text-[28px] leading-tight text-[color:var(--color-ink)]">
                {s.title}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.6] text-[color:var(--color-ink-soft)]">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
