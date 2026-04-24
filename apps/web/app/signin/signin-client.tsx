'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OtpFlow } from '@/components/otp-flow';

export function SignInClient() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function verify(code: string) {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/auth/otp/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const j = await r.json();
      if (!j.ok) { setErr(j.error ?? 'Could not sign in.'); return; }
      router.push('/');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <OtpFlow
        purpose="CUSTOMER_SIGNIN"
        phone={phone}
        onChangePhone={setPhone}
        busy={busy}
        submitLabel="Verify & enter"
        onVerify={verify}
        topError={err}
      />
      <p className="text-[11.5px] text-[color:var(--color-ink-soft)]/65 text-center pt-3">
        By continuing you accept our terms. We only text about Magarpatta Go.
      </p>
    </>
  );
}
