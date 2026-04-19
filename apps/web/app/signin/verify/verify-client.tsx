'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const LEN = 6;

export function VerifyClient() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(30);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const saved = sessionStorage.getItem('mg_phone');
    if (!saved) {
      router.replace('/signin');
      return;
    }
    setPhone(saved);
    refs.current[0]?.focus();
  }, [router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const code = digits.join('');
  const complete = code.length === LEN;

  function setDigit(i: number, v: string) {
    const clean = v.replace(/[^0-9]/g, '').slice(0, 1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    setError(null);
    if (clean && i < LEN - 1) refs.current[i + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, LEN);
    if (!text) return;
    e.preventDefault();
    const next = Array(LEN).fill('');
    text.split('').forEach((c, i) => (next[i] = c));
    setDigits(next);
    refs.current[Math.min(text.length, LEN - 1)]?.focus();
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  }

  async function submit(finalCode?: string) {
    const toVerify = finalCode ?? code;
    if (toVerify.length !== LEN) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: toVerify }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Incorrect code');
        setDigits(Array(LEN).fill(''));
        refs.current[0]?.focus();
        setLoading(false);
        return;
      }
      sessionStorage.removeItem('mg_phone');
      router.push('/');
    } catch {
      setError('Network error. Try again.');
      setLoading(false);
    }
  }

  useEffect(() => {
    if (complete && !loading) submit(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete]);

  async function resend() {
    if (resendIn > 0) return;
    setResendIn(30);
    await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-[13.5px] text-[color:var(--color-ink-soft)]">
        Code sent to <span className="font-medium text-[color:var(--color-ink)]">+91 {phone}</span>
        {' · '}
        <button
          onClick={() => router.push('/signin')}
          className="underline underline-offset-4 hover:text-[color:var(--color-forest)]"
        >
          change
        </button>
      </p>

      <div className="flex items-center gap-2.5" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            disabled={loading}
            className={cn(
              'w-12 h-14 sm:w-14 sm:h-16 text-center text-[22px] font-serif rounded-xl border bg-[color:var(--color-paper)] outline-none transition-all',
              error
                ? 'border-[color:var(--color-terracotta)]/50'
                : d
                  ? 'border-[color:var(--color-forest)] text-[color:var(--color-forest-dark)]'
                  : 'border-[color:var(--color-ink)]/15 focus:border-[color:var(--color-forest)]',
            )}
          />
        ))}
      </div>

      {error && <p className="text-[13px] text-[color:var(--color-terracotta)]">{error}</p>}

      <div className="flex items-center justify-between">
        <button
          onClick={resend}
          disabled={resendIn > 0}
          className={cn(
            'text-[13px]',
            resendIn > 0
              ? 'text-[color:var(--color-ink-soft)]/50 cursor-not-allowed'
              : 'text-[color:var(--color-forest)] hover:underline underline-offset-4',
          )}
        >
          {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
        </button>
        {loading && (
          <span className="inline-flex items-center gap-2 text-[13px] text-[color:var(--color-ink-soft)]">
            <svg width="14" height="14" viewBox="0 0 16 16" className="animate-spin">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="28" strokeDashoffset="10" />
            </svg>
            Verifying
          </span>
        )}
      </div>
    </div>
  );
}
