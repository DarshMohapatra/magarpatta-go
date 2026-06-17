'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OtpFlow } from '@/components/otp-flow';
import { PartnerAuthShell } from '@/components/auth/partner-auth-shell';

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
    <PartnerAuthShell
      surfaceLabel="Admin console"
      eyebrow="Admin sign-in"
      title="Ops console."
      subtitle="Restricted access. We'll text a 6-digit OTP to the registered admin phone. Entry attempts are logged."
    >
      <OtpFlow
        purpose="ADMIN_SIGNIN"
        phone={phone}
        onChangePhone={setPhone}
        busy={busy}
        submitLabel="Sign in"
        onVerify={verify}
        topError={err}
      />

      <p className="mt-8 text-[11.5px] text-[color:var(--color-muted)]/60 font-mono">
        Demo admin · 9999999999 · OTP 123456
      </p>
    </PartnerAuthShell>
  );
}
