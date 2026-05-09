'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { siteConfig } from '@/lib/site-config';

const NAV = [
  { href: '/helpdesk', label: 'Queue' },
  { href: '/helpdesk/resolved', label: 'Resolved' },
];

export function HelpdeskShell({ name, children }: { name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try { await fetch('/api/helpdesk/session', { method: 'DELETE' }); } catch {}
    startTransition(() => { router.push('/helpdesk/signin'); router.refresh(); });
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-[color:var(--color-ink)]/8 bg-[color:var(--color-paper)] sticky top-0 z-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-saffron)] pulse-ring" />
            <span className="text-[14px] tracking-tight font-medium whitespace-nowrap">
              {siteConfig.wordmarkRoot} <span className="font-serif italic text-[color:var(--color-forest)]">Go</span>
              <span className="ml-1.5 text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-terracotta)]">Helpdesk</span>
            </span>
            <span className="hidden sm:inline text-[color:var(--color-ink-soft)]/30">·</span>
            <span className="hidden sm:inline text-[13px]">{name}</span>
          </div>
          <button onClick={signOut} disabled={signingOut} className="text-[12px] text-[color:var(--color-terracotta)] hover:underline">
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
        <nav className="mx-auto max-w-[1280px] px-4 sm:px-6 pb-0.5 overflow-x-auto">
          <ul className="flex items-center gap-1 text-[13px]">
            {NAV.map((n) => {
              const active = n.href === '/helpdesk' ? pathname === '/helpdesk' : pathname.startsWith(n.href);
              return (
                <li key={n.href}>
                  <Link href={n.href} className={`inline-block px-3 py-2 rounded-t-lg border-b-2 transition-colors ${
                    active
                      ? 'border-[color:var(--color-forest)] text-[color:var(--color-ink)] font-medium'
                      : 'border-transparent text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)]'
                  }`}>{n.label}</Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-8">{children}</div>
    </main>
  );
}
