'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const DEMO_LOGINS = [
  { label: 'Kalika Sweets', phone: '9000000001', password: 'kalika123' },
  { label: "Baker's Basket", phone: '9000000002', password: 'bakers123' },
];

export function VendorSignInClient() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/vendor/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error ?? 'Could not sign in.');
        setBusy(false);
        return;
      }
      router.push('/vendor');
      router.refresh();
    } catch {
      setErr('Network error.');
      setBusy(false);
    }
  }

  return (
    <section className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px]">
        <div className="inline-flex items-center gap-2.5 mb-6">
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-saffron)] pulse-ring" />
          <span className="text-[15px] tracking-tight font-medium">
            Magarpatta <span className="font-serif italic text-[color:var(--color-forest)]">Go</span>
            <span className="ml-2 text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-terracotta)]">Vendor</span>
          </span>
        </div>
        <h1 className="font-serif text-[36px] sm:text-[44px] leading-[1.02] tracking-[-0.02em]">
          Open your <span className="italic text-[color:var(--color-forest)]">counter.</span>
        </h1>
        <p className="mt-3 text-[14px] text-[color:var(--color-ink-soft)]">
          Sign in with the owner phone you registered with. New shop?{' '}
          <Link href="/vendor/register" className="text-[color:var(--color-forest)] underline underline-offset-2">
            Register here
          </Link>.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">
              Owner phone
            </span>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-3 focus-within:border-[color:var(--color-forest)]">
              <span className="text-[13px] text-[color:var(--color-ink-soft)]">+91</span>
              <input
                autoFocus
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit number"
                className="flex-1 bg-transparent outline-none text-[15px] tracking-[0.04em]"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-3 text-[15px] outline-none focus:border-[color:var(--color-forest)]"
            />
          </label>

          {err && <p className="text-[12.5px] text-[color:var(--color-terracotta-dark)]">{err}</p>}

          <button
            type="submit"
            disabled={phone.length !== 10 || password.length < 3 || busy}
            className="w-full rounded-xl bg-[color:var(--color-forest)] text-[color:var(--color-cream)] py-3.5 text-[14.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? 'Opening…' : 'Open counter'}
          </button>
        </form>

        <details className="mt-8 text-[12px] text-[color:var(--color-ink-soft)]/80">
          <summary className="cursor-pointer">Demo logins · tap to prefill</summary>
          <div className="mt-2 space-y-1 font-mono">
            {DEMO_LOGINS.map((d) => (
              <button
                key={d.phone}
                type="button"
                onClick={() => { setPhone(d.phone); setPassword(d.password); }}
                className="block text-left text-[color:var(--color-forest)] hover:underline"
              >
                {d.phone} / {d.password} · <span className="font-sans text-[color:var(--color-ink)]">{d.label}</span>
              </button>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
