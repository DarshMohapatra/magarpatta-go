'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function onClick() {
    setBusy(true);
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
    } catch {
      /* swallow — we redirect either way */
    }
    startTransition(() => {
      router.push('/');
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex items-center justify-between w-full px-4 py-3.5 text-[14px] text-[color:var(--color-terracotta)] hover:bg-[color:var(--color-background)]/40 transition-colors disabled:opacity-60"
    >
      <span className="flex items-center gap-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--color-terracotta)]/15">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 17l5-5-5-5" />
            <path d="M20 12H9" />
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          </svg>
        </span>
        {busy ? 'Signing out…' : 'Sign out'}
      </span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[color:var(--color-muted)] shrink-0">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}
