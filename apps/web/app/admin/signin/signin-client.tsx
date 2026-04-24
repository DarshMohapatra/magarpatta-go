'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OtpFlow } from '@/components/otp-flow';

export function AdminSignInClient() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function verify(code: string) {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const j = await r.json();
      if (!j.ok) { setErr(j.error ?? 'Could not sign in.'); return; }
      router.push('/admin');
      router.refresh();
    } finally {
      setBusy(false);
    }
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
          Restricted access. We&apos;ll text a 6-digit OTP to the registered admin phone. Entry attempts are logged.
        </p>

        <OtpFlow
          purpose="ADMIN_SIGNIN"
          phone={phone}
          onChangePhone={setPhone}
          busy={busy}
          submitLabel="Sign in"
          onVerify={verify}
          topError={err}
        />

        <p className="mt-8 text-[11.5px] text-[color:var(--color-ink-soft)]/60 font-mono">
          Demo admin · 9999999999 · OTP 123456
        </p>
      </div>
    </section>
  );
}
