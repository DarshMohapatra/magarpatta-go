const COL = [
  {
    title: 'Magarpatta Go',
    links: [
      { label: 'How it works', href: '#how' },
      { label: 'Partners', href: '#partners' },
      { label: 'Why us', href: '#why' },
      { label: 'Join waitlist', href: '#waitlist' },
    ],
  },
  {
    title: 'Categories',
    links: [
      { label: 'Food & dining', href: '#menu' },
      { label: 'Groceries', href: '#menu' },
      { label: 'Medicines', href: '#menu' },
      { label: 'Fresh meat', href: '#menu' },
      { label: 'Daily essentials', href: '#menu' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Partner with us', href: '#' },
      { label: 'Ride with us', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms', href: '#' },
      { label: 'Privacy', href: '#' },
      { label: 'Refund policy', href: '#' },
      { label: 'Shipping policy', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-[color:var(--color-forest-dark)] text-[color:var(--color-cream)]/80 pt-20 pb-10 mt-0">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid lg:grid-cols-[1.4fr_repeat(4,1fr)] gap-10 lg:gap-14 pb-16 border-b border-[color:var(--color-cream)]/15">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-saffron)]" />
              <span className="text-[15px] tracking-tight font-medium text-[color:var(--color-cream)]">
                Magarpatta <span className="font-serif italic text-[color:var(--color-saffron-soft)]">Go</span>
              </span>
            </div>
            <p className="mt-5 font-serif text-[22px] leading-[1.35] text-[color:var(--color-cream)]">
              Hyper-local delivery, made only for the 35,000 of us inside the gates.
            </p>
            <p className="mt-4 text-[13px] leading-[1.6] text-[color:var(--color-cream)]/60">
              Built in Magarpatta City, Pune. Four riders. Sixteen societies. Zero borders crossed.
            </p>
          </div>

          {COL.map((c) => (
            <div key={c.title}>
              <h4 className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron-soft)] mb-5">
                {c.title}
              </h4>
              <ul className="space-y-3">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-[13.5px] text-[color:var(--color-cream)]/70 hover:text-[color:var(--color-cream)] transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-[12px] text-[color:var(--color-cream)]/55">
          <div>© 2026 Magarpatta Go. Not affiliated with MTDCC. FSSAI pending.</div>
          <div className="flex items-center gap-5">
            <span>Made with care in Magarpatta City</span>
            <span className="h-4 w-px bg-[color:var(--color-cream)]/20" />
            <span>v0.1.0 · Phase 1 · MVP</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
