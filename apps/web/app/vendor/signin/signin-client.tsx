'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OtpFlow } from '@/components/otp-flow';

const DEMO_PHONES = [
  { label: 'Kalika Sweets',        phone: '9000000001' },
  { label: "Baker's Basket",       phone: '9000000002' },
  { label: 'Destination Centre',   phone: '9000000004' },
  { label: 'Shraddha Meats',       phone: '9000000005' },
  { label: 'Magarpatta Pharmacy',  phone: '9000000006' },
  { label: 'Starbucks · Seasons',  phone: '9000000007' },
];

export function VendorSignInClient() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function verify(code: string) {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/vendor/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const j = await r.json();
      if (!j.ok) { setErr(j.error ?? 'Could not sign in.'); return; }
      router.push('/vendor');
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
            <span className="ml-2 text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-terracotta)]">Vendor</span>
          </span>
        </div>
        <h1 className="font-serif text-[36px] sm:text-[44px] leading-[1.02] tracking-[-0.02em]">
          Open your <span className="italic text-[color:var(--color-forest)]">counter.</span>
        </h1>
        <p className="mt-3 text-[14px] text-[color:var(--color-ink-soft)]">
          Sign in with your registered owner phone. We&apos;ll send a 6-digit OTP. New shop?{' '}
          <Link href="/vendor/register" className="text-[color:var(--color-forest)] underline underline-offset-2">
            Register here
          </Link>.
        </p>

        <OtpFlow
          purpose="VENDOR_SIGNIN"
          phone={phone}
          onChangePhone={setPhone}
          busy={busy}
          submitLabel="Open counter"
          onVerify={verify}
          topError={err}
        />

        <details className="mt-8 text-[12px] text-[color:var(--color-ink-soft)]/80">
          <summary className="cursor-pointer">Demo vendors · tap to prefill · OTP is 123456</summary>
          <div className="mt-2 space-y-1 font-mono">
            {DEMO_PHONES.map((d) => (
              <button
                key={d.phone}
                type="button"
                onClick={() => setPhone(d.phone)}
                className="block text-left text-[color:var(--color-forest)] hover:underline"
              >
                {d.phone} · <span className="font-sans text-[color:var(--color-ink)]">{d.label}</span>
              </button>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
