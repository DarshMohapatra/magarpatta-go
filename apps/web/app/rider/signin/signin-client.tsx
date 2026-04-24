'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OtpFlow } from '@/components/otp-flow';
import { RIDERS } from '@/lib/riders';

export function RiderSignInClient() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function verify(code: string) {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/rider/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const j = await r.json();
      if (!j.ok) { setErr(j.error ?? 'Could not sign in.'); return; }
      router.push('/rider');
      router.refresh();
    } finally {
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
            <span className="ml-2 text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-terracotta)]">Rider</span>
          </span>
        </div>
        <h1 className="font-serif text-[36px] sm:text-[44px] leading-[1.02] tracking-[-0.02em]">
          Clock in,{' '}
          <span className="italic text-[color:var(--color-forest)]">neighbour.</span>
        </h1>
        <p className="mt-3 text-[14px] text-[color:var(--color-ink-soft)]">
          Enter your rider phone. We&apos;ll send a 6-digit OTP. New here?{' '}
          <Link href="/rider/register" className="text-[color:var(--color-forest)] underline underline-offset-2">
            Apply to ride
          </Link>.
        </p>

        <OtpFlow
          purpose="RIDER_SIGNIN"
          phone={phone}
          onChangePhone={setPhone}
          busy={busy}
          submitLabel="Start shift"
          onVerify={verify}
          topError={err}
        />

        <details className="mt-8 text-[12px] text-[color:var(--color-ink-soft)]/80">
          <summary className="cursor-pointer">Demo roster · tap to prefill · OTP is 123456</summary>
          <div className="mt-2 space-y-1 font-mono">
            {RIDERS.map((r) => (
              <button
                key={r.phone}
                type="button"
                onClick={() => setPhone(r.phone)}
                className="block text-left text-[color:var(--color-forest)] hover:underline"
              >
                {r.phone} · <span className="font-sans text-[color:var(--color-ink)]">{r.name}</span>
              </button>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
