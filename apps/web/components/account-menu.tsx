'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { SessionUser } from '@/lib/session';

interface Props {
  initialSession: SessionUser | null;
}

export function AccountMenu({ initialSession }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<SessionUser | null>(initialSession);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  // Keep client state in sync when server re-renders with a fresh session
  // (e.g. after router.refresh() following sign-in or address update).
  useEffect(() => {
    setSession(initialSession);
  }, [initialSession]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function signOut() {
    // Optimistic UI wipe — then await the DELETE so the next page's server
    // components can't read a stale cookie during navigation.
    setSigningOut(true);
    setOpen(false);
    setSession(null);
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
    } catch {
      /* cookie may already be gone; navigate anyway */
    }
    startTransition(() => {
      router.push('/');
      router.refresh();
    });
  }

  if (!session) {
    return (
      <>
        <a
          href="/signin"
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] text-[color:var(--color-ink)] hover:bg-[color:var(--color-ink)]/5 transition-colors"
        >
          Sign in
        </a>
        <a
          href="/signup"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)] transition-colors"
        >
          Create account
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="-mr-0.5">
            <path d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </>
    );
  }

  const initial = (session.name?.[0] ?? session.phone?.[0] ?? '?').toUpperCase();
  const hasAddress = Boolean(session.society && session.building);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] hover:border-[color:var(--color-forest)]/40 transition-colors"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] text-[12px] font-medium">
          {initial}
        </span>
        <div className="hidden sm:block text-left leading-tight">
          <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/70">
            {hasAddress ? session.building : 'No address'}
          </div>
          <div className="text-[12.5px] font-medium text-[color:var(--color-ink)]">
            {session.name || `+91 ${session.phone}`}
          </div>
        </div>
        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" className={cn('transition-transform', open && 'rotate-180')}>
          <path d="M3.5 5.5L7 9l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[260px] rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] shadow-[0_24px_60px_-20px_rgba(15,15,14,0.25)] overflow-hidden z-50">
          <div className="px-4 py-4 border-b border-[color:var(--color-ink)]/8">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">
              Delivering to
            </div>
            <div className="mt-1 font-serif text-[18px] leading-tight text-[color:var(--color-ink)]">
              {hasAddress ? (
                <>
                  Flat {session.flat}, {session.building}
                </>
              ) : (
                <span className="italic text-[color:var(--color-ink-soft)]">Address not set yet</span>
              )}
            </div>
            {hasAddress && (
              <div className="text-[12px] text-[color:var(--color-ink-soft)]/75">{session.society}</div>
            )}
          </div>

          <nav className="py-1">
            <a href="/menu" className="block px-4 py-2.5 text-[13.5px] hover:bg-[color:var(--color-cream)] text-[color:var(--color-ink)]">
              Browse menu
            </a>
            <a href="#" className="block px-4 py-2.5 text-[13.5px] hover:bg-[color:var(--color-cream)] text-[color:var(--color-ink)]">
              Orders
              <span className="ml-2 text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/60">soon</span>
            </a>
            <a href="/signup" className="block px-4 py-2.5 text-[13.5px] hover:bg-[color:var(--color-cream)] text-[color:var(--color-ink)]">
              Update address
            </a>
          </nav>

          <div className="border-t border-[color:var(--color-ink)]/8 py-1">
            <button
              onClick={signOut}
              disabled={signingOut}
              className="w-full text-left px-4 py-2.5 text-[13.5px] hover:bg-[color:var(--color-cream)] text-[color:var(--color-terracotta)]"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
