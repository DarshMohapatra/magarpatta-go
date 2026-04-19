'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#menu', label: 'Menu' },
  { href: '#partners', label: 'Partners' },
  { href: '#why', label: 'Why us' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-[color:var(--color-cream)]/75 backdrop-blur-md border-b border-[color:var(--color-ink)]/8'
          : 'bg-transparent',
      )}
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5 group">
          <span className="relative inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[color:var(--color-saffron)] text-[color:var(--color-saffron)] pulse-ring" />
          <span className="text-[15px] tracking-tight font-medium">
            Magarpatta <span className="font-serif italic text-[color:var(--color-forest)]">Go</span>
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13.5px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="/signin"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] text-[color:var(--color-ink)] hover:bg-[color:var(--color-ink)]/5 transition-colors"
          >
            Sign in
          </a>
          <a
            href="#waitlist"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)] transition-colors"
          >
            Check delivery
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="-mr-0.5">
              <path d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
