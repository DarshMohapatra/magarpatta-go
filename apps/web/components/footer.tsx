import { siteConfig } from '@/lib/site-config';
import { SOCIETY_COUNT } from '@/lib/societies';

const COL = [
  {
    title: siteConfig.platformName,
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
      { label: 'Partner with us', href: '/partner' },
      { label: 'List your shop', href: '/partner/vendor' },
      { label: 'Deliver with us', href: '/partner/rider' },
      { label: 'Admin console', href: '/partner/admin' },
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
    <footer className="block w-full bg-[color:var(--color-forest-dark)] text-[color:var(--color-cream)]/80 pt-14 pb-10 mt-0">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-6 lg:px-10">
        {/* Brand block — full-width on mobile, narrower-but-leading on desktop. */}
        <div className="pb-10 border-b border-[color:var(--color-cream)]/15 lg:border-b-0 lg:pb-0 lg:hidden">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-saffron)]" />
            <span className="text-[15px] tracking-tight font-medium text-[color:var(--color-cream)]">
              {siteConfig.wordmarkRoot} <span className="font-serif italic text-[color:var(--color-saffron-soft)]">Go</span>
            </span>
          </div>
          <p className="mt-4 font-serif text-[20px] leading-[1.3] text-[color:var(--color-cream)]">
            Hyper-local delivery, made only for the residents inside the gates.
          </p>
          <p className="mt-3 text-[13px] leading-[1.55] text-[color:var(--color-cream)]/60">
            Built in {siteConfig.siteName}, {siteConfig.city}. {SOCIETY_COUNT} societies. Zero borders crossed.
          </p>
        </div>

        {/* Link columns — even 2-up grid on phones (sm+), 4-up on desktop. */}
        <div className="mt-10 lg:mt-0 lg:hidden grid grid-cols-2 gap-x-6 gap-y-8">
          {COL.map((c) => (
            <div key={c.title}>
              <h4 className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron-soft)] mb-3">
                {c.title}
              </h4>
              <ul className="space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-[13px] text-[color:var(--color-cream)]/70 hover:text-[color:var(--color-cream)] transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Desktop layout: brand wide + four narrow link columns in a row. */}
        <div className="hidden lg:grid lg:grid-cols-[1.4fr_repeat(4,1fr)] gap-14 pb-12 border-b border-[color:var(--color-cream)]/15">
          <div className="max-w-md">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-saffron)]" />
              <span className="text-[15px] tracking-tight font-medium text-[color:var(--color-cream)]">
                {siteConfig.wordmarkRoot} <span className="font-serif italic text-[color:var(--color-saffron-soft)]">Go</span>
              </span>
            </div>
            <p className="mt-5 font-serif text-[22px] leading-[1.35] text-[color:var(--color-cream)]">
              Hyper-local delivery, made only for the residents inside the gates.
            </p>
            <p className="mt-4 text-[13px] leading-[1.6] text-[color:var(--color-cream)]/60">
              Built in {siteConfig.siteName}, {siteConfig.city}. {SOCIETY_COUNT} societies. Zero borders crossed.
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

        {/* Bottom bar — stacks on mobile, single row on desktop. */}
        <div className="mt-10 pt-6 border-t border-[color:var(--color-cream)]/15 lg:mt-8 lg:border-t-0 lg:pt-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[12px] text-[color:var(--color-cream)]/55">
          <div>© 2026 {siteConfig.platformName}. FSSAI pending.</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Made with care in {siteConfig.siteName}</span>
            <span className="hidden sm:inline-block h-4 w-px bg-[color:var(--color-cream)]/20" />
            <span>v0.1.0 · Phase 1 · MVP</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
