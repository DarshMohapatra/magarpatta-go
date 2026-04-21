'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CartButton } from './cart-button';
import { AccountMenu } from './account-menu';
import type { SessionUser } from '@/lib/session';

const LINKS = [
  { href: '/menu', label: 'Menu' },
  { href: '/restaurants', label: 'Restaurants' },
  { href: '/home#how', label: 'How it works' },
  { href: '/home#why', label: 'Why us' },
];

interface NavbarProps {
  initialSession?: SessionUser | null;
}

export function Navbar({ initialSession = null }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change (navigating via link)
  useEffect(() => {
    if (!mobileOpen) return;
    const close = () => setMobileOpen(false);
    window.addEventListener('hashchange', close);
    return () => window.removeEventListener('hashchange', close);
  }, [mobileOpen]);

  return (
    <>
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-50 transition-all duration-500',
          scrolled || mobileOpen
            ? 'bg-[color:var(--color-cream)]/90 backdrop-blur-md border-b border-[color:var(--color-ink)]/8'
            : 'bg-transparent',
        )}
      >
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link href={initialSession ? '/menu' : '/'} className="flex items-center gap-2.5 group">
            <span className="relative inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[color:var(--color-saffron)] text-[color:var(--color-saffron)] pulse-ring" />
            <span className="text-[15px] tracking-tight font-medium">
              Magarpatta <span className="font-serif italic text-[color:var(--color-forest)]">Go</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[13.5px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)] transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <CartButton />
            <div className="hidden sm:flex items-center gap-1">
              <AccountMenu initialSession={initialSession} />
            </div>

            {/* Mobile hamburger */}
            <button
              aria-label="Menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((s) => !s)}
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-[color:var(--color-ink)]/5 ml-1"
            >
              {mobileOpen ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-[color:var(--color-ink)]/8 bg-[color:var(--color-paper)] shadow-[0_12px_40px_-12px_rgba(14,17,12,0.18)]">
            <div className="mx-auto max-w-[1280px] px-4 py-4 space-y-1">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-[14.5px] text-[color:var(--color-ink)] hover:bg-[color:var(--color-cream)]"
                >
                  {l.label}
                </Link>
              ))}

              <div className="pt-3 mt-3 border-t border-[color:var(--color-ink)]/8">
                {initialSession ? (
                  <>
                    <div className="px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">
                      {initialSession.name ? initialSession.name : `+91 ${initialSession.phone}`}
                      {initialSession.society && (
                        <span className="ml-1 normal-case tracking-normal text-[color:var(--color-ink-soft)]/75">
                          · {initialSession.building}
                        </span>
                      )}
                    </div>
                    <Link href="/orders" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-[14px] text-[color:var(--color-ink)] hover:bg-[color:var(--color-cream)]">
                      My orders
                    </Link>
                    <Link href="/signup" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-[14px] text-[color:var(--color-ink)] hover:bg-[color:var(--color-cream)]">
                      Update address
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/signin" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-[14px] text-[color:var(--color-ink)] hover:bg-[color:var(--color-cream)]">
                      Sign in
                    </Link>
                    <Link href="/signup" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-[14px] bg-[color:var(--color-forest)] text-[color:var(--color-cream)] text-center font-medium mt-1">
                      Create account
                    </Link>
                  </>
                )}
              </div>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
