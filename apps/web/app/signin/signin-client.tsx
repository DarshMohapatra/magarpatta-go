'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function SignInClient() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const valid = /^[6-9]\d{9}$/.test(phone);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Could not send OTP');
        setLoading(false);
        return;
      }
      if (data.devHint) setHint(data.devHint);
      sessionStorage.setItem('mg_phone', phone);
      router.push('/signin/verify');
    } catch {
      setError('Network error. Try again.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        className={cn(
          'rounded-2xl border bg-[color:var(--color-paper)] px-5 py-4 transition-colors',
          error
            ? 'border-[color:var(--color-terracotta)]/60'
            : 'border-[color:var(--color-ink)]/12 focus-within:border-[color:var(--color-forest)]',
        )}
      >
        <label className="block text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/70">
          Mobile number
        </label>
        <div className="mt-1 flex items-center gap-3">
          <span className="text-[16px] text-[color:var(--color-ink-soft)]">+91</span>
          <input
            autoFocus
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value.replace(/[^0-9]/g, ''));
              setError(null);
            }}
            placeholder="98765 43210"
            className="w-full bg-transparent outline-none text-[18px] tracking-wide placeholder:text-[color:var(--color-ink-soft)]/40"
          />
          {valid && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)]">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2.5 6.5l2.5 2.5 4.5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}
        </div>
      </div>

      {error && <p className="text-[13px] text-[color:var(--color-terracotta)]">{error}</p>}
      {hint && (
        <p className="text-[12px] text-[color:var(--color-ink-soft)]/70">
          Dev hint · OTP is <span className="font-mono font-medium text-[color:var(--color-forest)]">{hint}</span>
        </p>
      )}

      <button
        type="submit"
        disabled={!valid || loading}
        className={cn(
          'w-full px-5 py-4 rounded-2xl font-medium text-[15px] transition-colors flex items-center justify-center gap-2',
          valid
            ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)]'
            : 'bg-[color:var(--color-ink)]/8 text-[color:var(--color-ink-soft)]/50 cursor-not-allowed',
          loading && 'opacity-60',
        )}
      >
        {loading ? (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" className="animate-spin">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="28" strokeDashoffset="10" />
            </svg>
            Sending code…
          </>
        ) : (
          <>
            Send OTP
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </>
        )}
      </button>

      <p className="text-[12px] text-[color:var(--color-ink-soft)]/65 text-center pt-1">
        By continuing you accept our terms. We only text about Magarpatta Go.
      </p>
    </form>
  );
}
