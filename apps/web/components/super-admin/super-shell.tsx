'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export function SuperShell({ phone, children }: { phone: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try { await fetch('/api/super-admin/session', { method: 'DELETE' }); } catch {}
    startTransition(() => { router.push('/super-admin/signin'); router.refresh(); });
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-[color:var(--color-ink)]/10 bg-[color:var(--color-forest-dark)] text-[color:var(--color-cream)] sticky top-0 z-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-saffron)] pulse-ring" />
            <Link href="/super-admin" className="text-[14px] tracking-tight font-medium whitespace-nowrap">
              Super <span className="font-serif italic text-[color:var(--color-saffron-soft)]">Admin</span>
              <span className="ml-1.5 text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Cross-instance</span>
            </Link>
            <span className="hidden sm:inline text-[color:var(--color-cream)]/30">·</span>
            <span className="hidden sm:inline text-[12.5px] text-[color:var(--color-cream)]/70">+91 {phone}</span>
          </div>
          <button
            onClick={signOut}
            disabled={signingOut}
            className="text-[12px] text-[color:var(--color-saffron-soft)] hover:underline"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
        <nav className="mx-auto max-w-[1280px] px-4 sm:px-6 pb-0.5 overflow-x-auto">
          <ul className="flex items-center gap-1 text-[13px]">
            <li>
              <Link
                href="/super-admin"
                className={`inline-block px-3 py-2 rounded-t-lg border-b-2 transition-colors ${
                  pathname === '/super-admin'
                    ? 'border-[color:var(--color-saffron)] text-[color:var(--color-cream)] font-medium'
                    : 'border-transparent text-[color:var(--color-cream)]/55 hover:text-[color:var(--color-cream)]'
                }`}
              >
                Overview
              </Link>
            </li>
          </ul>
        </nav>
      </header>
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-8">{children}</div>
    </main>
  );
}
