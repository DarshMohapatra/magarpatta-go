'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OtpFlow } from '@/components/otp-flow';
import { PartnerAuthShell } from '@/components/auth/partner-auth-shell';

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
    <PartnerAuthShell
      surfaceLabel="Vendor portal"
      eyebrow="Vendor sign-in"
      title="Open your counter."
      subtitle="Sign in with your registered owner phone. We'll send a 6-digit OTP."
      registerHref="/vendor/register"
      registerLabel="Register a new shop"
    >
      <OtpFlow
        purpose="VENDOR_SIGNIN"
        phone={phone}
        onChangePhone={setPhone}
        busy={busy}
        submitLabel="Open counter"
        onVerify={verify}
        topError={err}
      />

      <details className="mt-8 text-[12px] text-[color:var(--color-muted)]/80">
        <summary className="cursor-pointer">Demo vendors · tap to prefill · OTP is 123456</summary>
        <div className="mt-2 space-y-1 font-mono">
          {DEMO_PHONES.map((d) => (
            <button
              key={d.phone}
              type="button"
              onClick={() => setPhone(d.phone)}
              className="block text-left text-[color:var(--color-primary)] hover:underline"
            >
              {d.phone} · <span className="font-sans text-[color:var(--color-foreground)]">{d.label}</span>
            </button>
          ))}
        </div>
      </details>
    </PartnerAuthShell>
  );
}
