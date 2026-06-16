'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart, cartCount } from '@/lib/cart';

interface Tab {
  href: string;
  label: string;
  /** Match function for the active state. usePathname() exact match by
   *  default — overridden for tabs like Home that should also match `/`. */
  match: (path: string) => boolean;
  icon: ReactNode;
}

const TABS: Tab[] = [
  {
    href: '/home',
    label: 'Home',
    match: (p) => p === '/' || p === '/home',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11.5L12 4l9 7.5" />
        <path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    href: '/menu',
    label: 'Search',
    match: (p) => p.startsWith('/menu'),
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
    ),
  },
  {
    href: '/orders',
    label: 'Orders',
    match: (p) => p.startsWith('/orders'),
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7l1 13h14l1-13" />
        <path d="M8 7V5a4 4 0 018 0v2" />
      </svg>
    ),
  },
  {
    href: '/account/addresses',
    label: 'Profile',
    match: (p) => p.startsWith('/account'),
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const items = useCart((s) => s.items);
  const count = cartCount(items);

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-30 mx-auto max-w-md border-t border-[color:var(--color-border)]/60 bg-[color:var(--color-surface)]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]"
    >
      <ul className="grid grid-cols-4 px-2 py-2">
        {TABS.map((t) => {
          const active = t.match(pathname);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className="relative flex flex-col items-center gap-1 py-1 group"
              >
                <span
                  className={
                    'relative inline-flex h-9 w-12 items-center justify-center rounded-full transition-colors ' +
                    (active
                      ? 'bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]'
                      : 'text-[color:var(--color-muted)] group-hover:text-[color:var(--color-foreground)]')
                  }
                >
                  {t.icon}
                  {t.label === 'Search' && count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] text-[9.5px] font-semibold px-1">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </span>
                <span
                  className={
                    'text-[10.5px] font-medium tracking-tight ' +
                    (active ? 'text-[color:var(--color-foreground)]' : 'text-[color:var(--color-muted)]')
                  }
                >
                  {t.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
