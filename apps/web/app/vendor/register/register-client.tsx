'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 1 | 2 | 3 | 4 | 'done';

const VENDOR_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Café' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'sweets', label: 'Sweets' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'meat', label: 'Fresh meat' },
  { value: 'pharmacy', label: 'Pharmacy' },
];

interface Form {
  shopName: string;
  vendorType: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  hub: string;
  addressLine: string;
  openTime: string;
  closeTime: string;
  gstin: string;
  fssaiNumber: string;
  drugLicense: string;
  panNumber: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  upiId: string;
}

const EMPTY: Form = {
  shopName: '', vendorType: 'restaurant', ownerName: '', ownerPhone: '', ownerEmail: '',
  hub: 'Magarpatta', addressLine: '', openTime: '10:00', closeTime: '22:00',
  gstin: '', fssaiNumber: '', drugLicense: '', panNumber: '',
  bankAccountName: '', bankAccountNumber: '', bankIfsc: '', upiId: '',
};

export function VendorRegisterClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<Form>(EMPTY);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Step 4 — OTP
  const [otpSentMsg, setOtpSentMsg] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [resendIn, setResendIn] = useState(0);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const step1Valid = form.shopName && form.ownerName && form.ownerPhone.length === 10;
  const step2Valid = true;
  const step3Valid = form.bankAccountName && form.bankAccountNumber.length >= 6 && form.bankIfsc.length >= 6;

  async function sendOtp() {
    setBusy(true); setErr(null); setOtpSentMsg(null);
    try {
      const r = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.ownerPhone, purpose: 'VENDOR_REGISTER' }),
      });
      const j = await r.json();
      if (!j.ok) { setErr(j.error ?? 'Could not send OTP.'); return; }
      setOtpSentMsg(
        j.demoOtp
          ? `Demo phone — use code ${j.demoOtp}.`
          : j.smsSent
            ? 'Code sent via SMS. Expires in 5 minutes.'
            : 'Code generated. Check the Vercel server logs for it.',
      );
      setResendIn(30);
      const t = setInterval(() => setResendIn((s) => {
        if (s <= 1) { clearInterval(t); return 0; }
        return s - 1;
      }), 1000);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (otpCode.length !== 6) { setErr('Enter the 6-digit code.'); return; }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/vendor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, otpCode }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error ?? 'Could not register.');
        setBusy(false);
        return;
      }
      setStep('done');
    } catch {
      setErr('Network error.');
      setBusy(false);
    }
  }

  if (step === 'done') {
    return (
      <section className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[520px] text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--color-forest)]/10 text-[color:var(--color-forest)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h1 className="font-serif text-[36px] leading-[1.02] tracking-[-0.02em]">
            Thanks, <span className="italic text-[color:var(--color-forest)]">neighbour.</span>
          </h1>
          <p className="mt-3 text-[14px] text-[color:var(--color-ink-soft)]">
            Your application is with the Magarpatta Go team. We usually approve in under 24 hours. You&apos;ll get a call on
            <span className="font-medium text-[color:var(--color-ink)]"> +91 {form.ownerPhone} </span>
            once your shop goes live. Signin is OTP-based — no password to remember.
          </p>
          <button
            onClick={() => router.push('/vendor/signin')}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-6 py-3 text-[13.5px] font-medium hover:bg-[color:var(--color-forest-dark)]"
          >
            Go to sign in
          </button>
        </div>
      </section>
    );
  }

  const stepLabel = (n: number) => (n === 1 ? 'Shop' : n === 2 ? 'KYC' : n === 3 ? 'Payouts' : 'Verify');

  return (
    <section className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-[640px]">
        <Link href="/vendor/signin" className="inline-flex items-center gap-1.5 text-[12.5px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)]">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 6H2m0 0l3.5 3.5M2 6l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back to sign in
        </Link>

        <div className="mt-4 inline-flex items-center gap-2.5">
          <span className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Vendor onboarding</span>
        </div>
        <h1 className="mt-2 font-serif text-[36px] sm:text-[44px] leading-[1.02] tracking-[-0.02em]">
          Put your shop on <span className="italic text-[color:var(--color-forest)]">Magarpatta Go.</span>
        </h1>

        <ol className="mt-8 flex items-center gap-2">
          {[1, 2, 3, 4].map((n) => (
            <li key={n} className="flex-1 flex items-center gap-2">
              <div className={`h-6 w-6 rounded-full text-[11px] font-medium flex items-center justify-center ${
                typeof step === 'number' && step >= n ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)]' : 'bg-[color:var(--color-ink)]/8 text-[color:var(--color-ink-soft)]/60'
              }`}>
                {n}
              </div>
              <span className="text-[11.5px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/75">
                {stepLabel(n)}
              </span>
              {n < 4 && <div className="h-px flex-1 bg-[color:var(--color-ink)]/12" />}
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-3xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6 sm:p-8 space-y-5">
          {step === 1 && (
            <>
              <Row label="Shop name">
                <input value={form.shopName} onChange={(e) => set('shopName', e.target.value)} className={inp} placeholder="e.g. Dosa House" />
              </Row>
              <Row label="Shop type">
                <select value={form.vendorType} onChange={(e) => set('vendorType', e.target.value)} className={inp}>
                  {VENDOR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Row>
              <Row label="Hub / location inside Magarpatta">
                <input value={form.hub} onChange={(e) => set('hub', e.target.value)} className={inp} placeholder="Seasons Mall / Destination Centre / Magarpatta Market" />
              </Row>
              <Row label="Full address">
                <input value={form.addressLine} onChange={(e) => set('addressLine', e.target.value)} className={inp} placeholder="Shop no., floor, landmark" />
              </Row>
              <div className="grid grid-cols-2 gap-4">
                <Row label="Opens at">
                  <input type="time" value={form.openTime} onChange={(e) => set('openTime', e.target.value)} className={inp} />
                </Row>
                <Row label="Closes at">
                  <input type="time" value={form.closeTime} onChange={(e) => set('closeTime', e.target.value)} className={inp} />
                </Row>
              </div>
              <div className="pt-3 border-t border-[color:var(--color-ink)]/8 space-y-5">
                <Row label="Owner name">
                  <input value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} className={inp} />
                </Row>
                <Row label="Owner phone (+91)">
                  <input
                    inputMode="numeric"
                    maxLength={10}
                    value={form.ownerPhone}
                    onChange={(e) => set('ownerPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className={inp}
                  />
                  <p className="mt-1 text-[11.5px] text-[color:var(--color-ink-soft)]/70">
                    We&apos;ll text a 6-digit code here to verify the phone. Signin is OTP-based — no password to set.
                  </p>
                </Row>
                <Row label="Owner email (optional)">
                  <input type="email" value={form.ownerEmail} onChange={(e) => set('ownerEmail', e.target.value)} className={inp} />
                </Row>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-[12.5px] text-[color:var(--color-ink-soft)]">
                Upload numbers are fine for now — we&apos;ll verify the documents over WhatsApp before approval.
              </p>
              <Row label="FSSAI number (food / bakery / sweets / meat)">
                <input value={form.fssaiNumber} onChange={(e) => set('fssaiNumber', e.target.value)} className={inp} placeholder="14-digit FSSAI licence" />
              </Row>
              <Row label="Drug licence (pharmacy only)">
                <input value={form.drugLicense} onChange={(e) => set('drugLicense', e.target.value)} className={inp} />
              </Row>
              <Row label="GSTIN (if registered)">
                <input value={form.gstin} onChange={(e) => set('gstin', e.target.value)} className={inp} placeholder="15-digit GSTIN" />
              </Row>
              <Row label="PAN">
                <input value={form.panNumber} onChange={(e) => set('panNumber', e.target.value)} className={inp} placeholder="ABCDE1234F" />
              </Row>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-[12.5px] text-[color:var(--color-ink-soft)]">
                Daily payouts land here. Commission is deducted automatically.
              </p>
              <Row label="Account holder name">
                <input value={form.bankAccountName} onChange={(e) => set('bankAccountName', e.target.value)} className={inp} />
              </Row>
              <Row label="Account number">
                <input value={form.bankAccountNumber} onChange={(e) => set('bankAccountNumber', e.target.value.replace(/\D/g, ''))} className={inp} />
              </Row>
              <Row label="IFSC">
                <input value={form.bankIfsc} onChange={(e) => set('bankIfsc', e.target.value.toUpperCase())} className={inp} placeholder="HDFC0001234" />
              </Row>
              <Row label="UPI ID (optional, for instant payouts)">
                <input value={form.upiId} onChange={(e) => set('upiId', e.target.value)} className={inp} placeholder="shopname@upi" />
              </Row>
            </>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">Verify phone</div>
                <h2 className="mt-1 font-serif text-[22px] leading-tight">One 6-digit code.</h2>
                <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-soft)]">
                  We&apos;ll text a code to <span className="font-medium text-[color:var(--color-ink)]">+91 {form.ownerPhone}</span>.
                  That phone becomes your signin identity — no password to set.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={busy || resendIn > 0}
                  onClick={sendOtp}
                  className="rounded-full border border-[color:var(--color-forest)]/35 text-[color:var(--color-forest)] px-4 py-2 text-[12.5px] hover:bg-[color:var(--color-forest)]/8 disabled:opacity-50"
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : otpSentMsg ? 'Resend code' : 'Send OTP'}
                </button>
                {otpSentMsg && (
                  <span className="text-[11.5px] text-[color:var(--color-ink-soft)]/80">{otpSentMsg}</span>
                )}
              </div>
              <Row label="Enter 6-digit OTP">
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className="mt-1 w-full rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-3 text-[20px] font-mono tracking-[0.5em] text-center outline-none focus:border-[color:var(--color-forest)]"
                />
              </Row>
            </div>
          )}

          {err && (
            <div className="rounded-xl bg-[color:var(--color-terracotta)]/10 border border-[color:var(--color-terracotta)]/25 px-4 py-3 text-[13px] text-[color:var(--color-terracotta-dark)]">
              {err}
            </div>
          )}

          <div className="pt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep((s) => (s === 1 ? 1 : ((s as number) - 1) as Step))}
              disabled={step === 1}
              className="text-[13px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)] disabled:opacity-40"
            >
              ← Back
            </button>
            {step < 4 ? (
              <button
                type="button"
                disabled={step === 1 ? !step1Valid : step === 2 ? !step2Valid : !step3Valid}
                onClick={() => {
                  const next = ((step as number) + 1) as Step;
                  setStep(next);
                  if (next === 4 && !otpSentMsg) setTimeout(sendOtp, 150);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-2.5 text-[13.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                disabled={otpCode.length !== 6 || busy}
                onClick={submit}
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-2.5 text-[13.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50"
              >
                {busy ? 'Submitting…' : 'Verify & submit'}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const inp = 'mt-1 w-full rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-2.5 text-[14px] outline-none focus:border-[color:var(--color-forest)]';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">{label}</span>
      {children}
    </label>
  );
}
