'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { CartButton } from './cart-button';
import { AccountMenu } from './account-menu';
import type { SessionUser } from '@/lib/session';

const LINKS = [
  { href: '/menu', label: 'Menu' },
  { href: '/home#how', label: 'How it works' },
  { href: '/home#partners', label: 'Partners' },
  { href: '/home#why', label: 'Why us' },
];

interface NavbarProps {
  initialSession?: SessionUser | null;
}

export function Navbar({ initialSession = null }: NavbarProps) {
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
        <a href="/" className="flex items-center gap-2.5 group">
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

        <div className="flex items-center gap-1 sm:gap-2">
          <CartButton />
          <AccountMenu initialSession={initialSession} />
        </div>
      </div>
    </header>
  );
}
