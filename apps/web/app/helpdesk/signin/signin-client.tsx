'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OtpFlow } from '@/components/otp-flow';
import { siteConfig } from '@/lib/site-config';
import { PartnerAuthShell } from '@/components/auth/partner-auth-shell';

export function HelpdeskSignInClient() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function verify(code: string) {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/helpdesk/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const j = await r.json();
      if (!j.ok) { setErr(j.error ?? 'Could not sign in.'); return; }
      router.push('/helpdesk');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <PartnerAuthShell
      surfaceLabel="Helpdesk"
      eyebrow="Helpdesk sign-in"
      title="Customer desk."
      subtitle="You receive every customer complaint as it comes in. Acknowledge, ask for missing details, fix what you can, and close the loop."
    >
      <OtpFlow
        purpose="HELPDESK_SIGNIN"
        phone={phone}
        onChangePhone={setPhone}
        busy={busy}
        submitLabel="Sign in"
        onVerify={verify}
        topError={err}
      />

      <p className="mt-8 text-[11.5px] text-[color:var(--color-muted)]/60 font-mono">
        Demo helpdesk · {siteConfig.demoHelpdeskPhone} · OTP 123456
      </p>
    </PartnerAuthShell>
  );
}
