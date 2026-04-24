'use client';

import { useEffect, useState } from 'react';

export type OtpPurpose =
  | 'CUSTOMER_SIGNIN'
  | 'VENDOR_SIGNIN'
  | 'VENDOR_REGISTER'
  | 'RIDER_SIGNIN'
  | 'RIDER_REGISTER'
  | 'ADMIN_SIGNIN';

interface Props {
  purpose: OtpPurpose;
  phone: string;                           // controlled by parent — 10-digit
  onChangePhone: (v: string) => void;
  busy?: boolean;                          // parent can disable during submit
  submitLabel: string;                     // e.g. 'Sign in', 'Register', 'Start shift'
  onVerify: (code: string) => void | Promise<void>;
  topError?: string | null;                // parent-supplied error (e.g. 'wrong password')
  phoneHelper?: React.ReactNode;           // optional tiny helper under phone input
}

export function OtpFlow({ purpose, phone, onChangePhone, busy, submitLabel, onVerify, topError, phoneHelper }: Props) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Live countdown for resend button
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!resendAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [resendAt]);

  const cooldownLeft = resendAt ? Math.max(0, Math.ceil((resendAt - now) / 1000)) : 0;

  async function sendOtp() {
    setSending(true); setErr(null); setMsg(null);
    try {
      const r = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose }),
      });
      const j = await r.json();
      if (!j.ok) { setErr(j.error ?? 'Could not send OTP.'); return; }
      setStep('code');
      setResendAt(Date.now() + 30 * 1000);
      setMsg(
        j.demoOtp
          ? `Demo phone detected — use code ${j.demoOtp} (no SMS sent).`
          : j.smsSent
            ? 'Code sent via SMS. It expires in 5 minutes.'
            : 'Code generated. Check the Vercel server logs for it.',
      );
    } finally {
      setSending(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (step === 'phone') {
      if (phone.length !== 10) { setErr('Enter a 10-digit phone.'); return; }
      await sendOtp();
      return;
    }
    if (code.length !== 6) { setErr('Enter the 6-digit code.'); return; }
    await onVerify(code);
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Phone</span>
        <div className="mt-1 flex items-center gap-2 rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-3 focus-within:border-[color:var(--color-forest)]">
          <span className="text-[13px] text-[color:var(--color-ink-soft)]">+91</span>
          <input
            autoFocus
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => onChangePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit number"
            disabled={step === 'code'}
            className="flex-1 bg-transparent outline-none text-[15px] tracking-[0.04em] disabled:opacity-60"
          />
          {step === 'code' && (
            <button
              type="button"
              onClick={() => { setStep('phone'); setCode(''); setMsg(null); setErr(null); }}
              className="text-[11px] text-[color:var(--color-forest)] hover:underline"
            >
              edit
            </button>
          )}
        </div>
        {phoneHelper && <div className="mt-1 text-[11.5px] text-[color:var(--color-ink-soft)]/75">{phoneHelper}</div>}
      </label>

      {step === 'code' && (
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Enter 6-digit code</span>
          <input
            autoFocus
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••••"
            className="mt-1 w-full rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-3 text-[20px] font-mono tracking-[0.5em] text-center outline-none focus:border-[color:var(--color-forest)]"
          />
          <div className="mt-2 flex items-center justify-between text-[11.5px]">
            <span className="text-[color:var(--color-ink-soft)]/80">{msg}</span>
            <button
              type="button"
              disabled={sending || cooldownLeft > 0}
              onClick={sendOtp}
              className="text-[color:var(--color-forest)] hover:underline disabled:opacity-40 disabled:no-underline"
            >
              {cooldownLeft > 0 ? `Resend in ${cooldownLeft}s` : sending ? 'Sending…' : 'Resend code'}
            </button>
          </div>
        </label>
      )}

      {(err || topError) && (
        <p className="text-[12.5px] text-[color:var(--color-terracotta-dark)]">{err ?? topError}</p>
      )}

      <button
        type="submit"
        disabled={busy || sending || (step === 'phone' ? phone.length !== 10 : code.length !== 6)}
        className="w-full rounded-xl bg-[color:var(--color-forest)] text-[color:var(--color-cream)] py-3.5 text-[14.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {step === 'phone' ? (sending ? 'Sending OTP…' : 'Send OTP') : (busy ? 'Verifying…' : submitLabel)}
      </button>
    </form>
  );
}
