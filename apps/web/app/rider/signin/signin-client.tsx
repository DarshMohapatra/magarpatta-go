'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OtpFlow } from '@/components/otp-flow';
import { RIDERS } from '@/lib/riders';
import { PartnerAuthShell } from '@/components/auth/partner-auth-shell';

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
    <PartnerAuthShell
      surfaceLabel="Rider app"
      eyebrow="Rider sign-in"
      title="Clock in, neighbour."
      subtitle="Enter your rider phone. We'll send a 6-digit OTP."
      registerHref="/rider/register"
      registerLabel="Apply to ride"
    >
      <OtpFlow
        purpose="RIDER_SIGNIN"
        phone={phone}
        onChangePhone={setPhone}
        busy={busy}
        submitLabel="Start shift"
        onVerify={verify}
        topError={err}
      />

      <details className="mt-8 text-[12px] text-[color:var(--color-muted)]/80">
        <summary className="cursor-pointer">Demo roster · tap to prefill · OTP is 123456</summary>
        <div className="mt-2 space-y-1 font-mono">
          {RIDERS.map((r) => (
            <button
              key={r.phone}
              type="button"
              onClick={() => setPhone(r.phone)}
              className="block text-left text-[color:var(--color-primary)] hover:underline"
            >
              {r.phone} · <span className="font-sans text-[color:var(--color-foreground)]">{r.name}</span>
            </button>
          ))}
        </div>
      </details>
    </PartnerAuthShell>
  );
}
