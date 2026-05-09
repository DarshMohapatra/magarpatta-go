'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SuperSignInClient() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/super-admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const j = await r.json();
      if (!j.ok) { setErr(j.error ?? 'Sign-in failed'); return; }
      router.push('/super-admin');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-cream)]/65">Phone</span>
        <div className="mt-1 flex items-center gap-2 rounded-lg border border-[color:var(--color-cream)]/15 bg-[color:var(--color-forest-dark)] px-3 py-2.5 focus-within:border-[color:var(--color-saffron)]">
          <span className="text-[13px] text-[color:var(--color-cream)]/55">+91</span>
          <input
            autoFocus
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setErr(null); }}
            placeholder="10-digit number"
            className="flex-1 bg-transparent outline-none text-[15px] tracking-[0.04em] text-[color:var(--color-cream)] placeholder:text-[color:var(--color-cream)]/30"
          />
        </div>
      </label>

      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-cream)]/65">Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setErr(null); }}
          className="mt-1 w-full rounded-lg border border-[color:var(--color-cream)]/15 bg-[color:var(--color-forest-dark)] px-3 py-2.5 text-[14px] text-[color:var(--color-cream)] outline-none focus:border-[color:var(--color-saffron)]"
        />
      </label>

      {err && <p className="text-[12.5px] text-[color:var(--color-saffron)]">{err}</p>}

      <button
        type="submit"
        disabled={busy || phone.length !== 10 || password.length === 0}
        className="w-full rounded-lg bg-[color:var(--color-saffron)] text-[color:var(--color-forest-dark)] py-3 text-[14px] font-medium hover:bg-[color:var(--color-saffron-soft)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
