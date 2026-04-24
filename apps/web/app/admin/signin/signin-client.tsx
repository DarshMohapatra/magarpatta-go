'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminSignInClient() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = await fetch('/api/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });
    const j = await r.json();
    if (!j.ok) { setErr(j.error ?? 'Could not sign in'); setBusy(false); return; }
    router.push('/admin');
    router.refresh();
  }

  return (
    <section className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="inline-flex items-center gap-2.5 mb-6">
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-saffron)] pulse-ring" />
          <span className="text-[15px] tracking-tight font-medium">
            Magarpatta <span className="font-serif italic text-[color:var(--color-forest)]">Go</span>
            <span className="ml-2 text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-terracotta)]">Admin</span>
          </span>
        </div>
        <h1 className="font-serif text-[36px] leading-[1.02] tracking-[-0.02em]">
          Ops <span className="italic text-[color:var(--color-forest)]">console.</span>
        </h1>
        <p className="mt-3 text-[13.5px] text-[color:var(--color-ink-soft)]">
          Restricted access. Entry attempts are logged.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Phone</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-3 focus-within:border-[color:var(--color-forest)]">
              <span className="text-[13px] text-[color:var(--color-ink-soft)]">+91</span>
              <input autoFocus inputMode="numeric" maxLength={10} value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="flex-1 bg-transparent outline-none text-[15px] tracking-[0.04em]" />
            </div>
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-3 text-[15px] outline-none focus:border-[color:var(--color-forest)]" />
          </label>
          {err && <p className="text-[12.5px] text-[color:var(--color-terracotta-dark)]">{err}</p>}
          <button type="submit" disabled={busy || phone.length !== 10 || !password}
            className="w-full rounded-xl bg-[color:var(--color-forest)] text-[color:var(--color-cream)] py-3.5 text-[14.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-8 text-[11.5px] text-[color:var(--color-ink-soft)]/60 font-mono">
          Demo · 9999999999 / admin123
        </p>
      </div>
    </section>
  );
}
