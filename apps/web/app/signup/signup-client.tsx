'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ConfirmationResult } from 'firebase/auth';
import { MAGARPATTA_SOCIETIES, getBuildings, getBuilding, validateFlat, type Building } from '@/lib/societies';
import { sendPhoneOtp, resetRecaptcha } from '@/lib/firebase-phone';
import { cn } from '@/lib/utils';

type Step = 0 | 1 | 2;

export function SignUpClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 0: identity
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Step 1: OTP
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [resendIn, setResendIn] = useState(30);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  // Step 2: address
  const [society, setSociety] = useState<string | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [flat, setFlat] = useState('');

  const phoneValid = /^[6-9]\d{9}$/.test(phone);
  const nameValid = name.trim().length >= 2;

  // Resend timer
  useEffect(() => {
    if (step !== 1 || resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn, step]);

  // Focus first OTP box
  useEffect(() => {
    if (step === 1) otpRefs.current[0]?.focus();
  }, [step]);

  const code = digits.join('');
  const otpComplete = code.length === 6;

  const flatValidation = useMemo(
    () => (building && flat ? validateFlat(flat, building) : null),
    [flat, building],
  );

  const addressComplete = !!society && !!building && flatValidation?.ok === true;

  async function sendOtp() {
    if (!nameValid || !phoneValid) return;
    setLoading(true);
    setError(null);
    try {
      const confirmation = await sendPhoneOtp(`+91${phone}`, 'recaptcha-container');
      confirmationRef.current = confirmation;
      setStep(1);
      setResendIn(30);
      setDigits(Array(6).fill(''));
    } catch (e) {
      const msg = (e as Error).message;
      resetRecaptcha('recaptcha-container');
      setError(
        msg.includes('too-many-requests')
          ? 'Too many attempts. Try again in a few minutes.'
          : msg.includes('invalid-phone-number')
            ? 'That phone number looks invalid.'
            : `Could not send OTP: ${msg}`,
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(finalCode?: string) {
    const toVerify = finalCode ?? code;
    if (toVerify.length !== 6) return;
    if (!confirmationRef.current) {
      setError('Session expired. Please resend the code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const credential = await confirmationRef.current.confirm(toVerify);
      const idToken = await credential.user.getIdToken();

      const res = await fetch('/api/auth/firebase-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Session failed');
        return;
      }

      await fetch('/api/users/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      setStep(2);
    } catch (e) {
      const msg = (e as Error).message;
      setError(
        msg.includes('invalid-verification-code')
          ? 'Incorrect code'
          : msg.includes('code-expired')
            ? 'Code expired. Request a new one.'
            : `Verification failed: ${msg}`,
      );
      setDigits(Array(6).fill(''));
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function saveAddress() {
    if (!addressComplete) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          society,
          building: building!.name,
          flat,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Could not save address');
        return;
      }
      router.refresh();
      router.push('/menu');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (resendIn > 0) return;
    setResendIn(30);
    setError(null);
    resetRecaptcha();
    try {
      const confirmation = await sendPhoneOtp(`+91${phone}`, 'recaptcha-container');
      confirmationRef.current = confirmation;
    } catch (e) {
      setError(`Could not resend: ${(e as Error).message}`);
    }
  }

  function setDigit(i: number, v: string) {
    const clean = v.replace(/\D/g, '').slice(0, 1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    setError(null);
    if (clean && i < 5) otpRefs.current[i + 1]?.focus();
    if (clean && i === 5) {
      const full = next.join('');
      if (full.length === 6) setTimeout(() => verifyOtp(full), 50);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = Array(6).fill('');
    text.split('').forEach((c, i) => (next[i] = c));
    setDigits(next);
    otpRefs.current[Math.min(text.length, 5)]?.focus();
    if (text.length === 6) setTimeout(() => verifyOtp(text), 50);
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) otpRefs.current[i - 1]?.focus();
  }

  return (
    <div className="space-y-8">
      {/* Invisible reCAPTCHA container — Firebase mounts here. */}
      <div id="recaptcha-container" />

      {/* Step indicator */}
      <Progress step={step} />

      {error && (
        <div className="flex items-start gap-2 px-4 py-2.5 rounded-xl border border-[color:var(--color-terracotta)]/25 bg-[color:var(--color-terracotta)]/5 text-[13px] text-[color:var(--color-terracotta)]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Step 0 — identity */}
      {step === 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendOtp();
          }}
          className="space-y-4"
        >
          <Field label="Your name">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Priya Rao"
              className="w-full bg-transparent outline-none text-[17px] placeholder:text-[color:var(--color-ink-soft)]/40"
            />
          </Field>

          <Field label="Mobile number">
            <div className="flex items-center gap-3">
              <span className="text-[16px] text-[color:var(--color-ink-soft)]">+91</span>
              <input
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="98765 43210"
                className="w-full bg-transparent outline-none text-[17px] tracking-wide placeholder:text-[color:var(--color-ink-soft)]/40"
              />
              {phoneValid && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)]">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </div>
          </Field>

          <PrimaryButton loading={loading} disabled={!nameValid || !phoneValid || loading}>
            Send OTP
          </PrimaryButton>

          <p className="text-[12.5px] text-[color:var(--color-ink-soft)]/70 text-center pt-1">
            Already have an account?{' '}
            <a href="/signin" className="underline underline-offset-4 hover:text-[color:var(--color-forest)]">
              Sign in instead
            </a>
          </p>
        </form>
      )}

      {/* Step 1 — verify */}
      {step === 1 && (
        <div className="space-y-5">
          <p className="text-[13.5px] text-[color:var(--color-ink-soft)]">
            Code sent to <span className="font-medium text-[color:var(--color-ink)]">+91 {phone}</span>
            {' · '}
            <button
              onClick={() => setStep(0)}
              className="underline underline-offset-4 hover:text-[color:var(--color-forest)]"
            >
              change
            </button>
          </p>

          <div className="flex items-center gap-2.5" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  otpRefs.current[i] = el;
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => handleKey(i, e)}
                disabled={loading}
                className={cn(
                  'w-12 h-14 sm:w-14 sm:h-16 text-center text-[22px] font-serif rounded-xl border bg-[color:var(--color-paper)] outline-none transition-all',
                  error
                    ? 'border-[color:var(--color-terracotta)]/50'
                    : d
                      ? 'border-[color:var(--color-forest)] text-[color:var(--color-forest-dark)]'
                      : 'border-[color:var(--color-ink)]/15 focus:border-[color:var(--color-forest)]',
                )}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={resendOtp}
              disabled={resendIn > 0}
              className={cn(
                'text-[13px]',
                resendIn > 0
                  ? 'text-[color:var(--color-ink-soft)]/50 cursor-not-allowed'
                  : 'text-[color:var(--color-forest)] hover:underline underline-offset-4',
              )}
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            </button>
            {loading && (
              <span className="inline-flex items-center gap-2 text-[13px] text-[color:var(--color-ink-soft)]">
                <Spinner />
                Verifying
              </span>
            )}
          </div>

          {otpComplete && !loading && (
            <PrimaryButton loading={false} disabled={false} onClick={() => verifyOtp()}>
              Continue
            </PrimaryButton>
          )}
        </div>
      )}

      {/* Step 2 — address */}
      {step === 2 && (
        <div className="space-y-5">
          <p className="text-[13.5px] text-[color:var(--color-ink-soft)]">
            Nice to meet you, <span className="font-medium text-[color:var(--color-ink)]">{name}</span>. Where should we deliver?
          </p>

          <AddressPicker
            society={society}
            setSociety={setSociety}
            building={building}
            setBuilding={setBuilding}
            flat={flat}
            setFlat={setFlat}
          />

          {building && flat && flatValidation && !flatValidation.ok && (
            <div className="flex items-start gap-2 px-4 py-2.5 rounded-xl border border-[color:var(--color-terracotta)]/25 bg-[color:var(--color-terracotta)]/5 text-[13px]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0 text-[color:var(--color-terracotta)]">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
                <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <div>
                <span className="text-[color:var(--color-terracotta)]">{flatValidation.reason}</span>
                {flatValidation.hint && (
                  <span className="text-[color:var(--color-ink-soft)]/80"> · {flatValidation.hint}</span>
                )}
              </div>
            </div>
          )}

          {building && flatValidation?.ok && (
            <p className="flex items-center gap-2 text-[13px] text-[color:var(--color-forest)]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Floor {flatValidation.floor}, unit {String(flatValidation.unit).padStart(2, '0')} · valid.
            </p>
          )}

          <PrimaryButton loading={loading} disabled={!addressComplete || loading} onClick={saveAddress}>
            Finish signup
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}

function Progress({ step }: { step: Step }) {
  const labels = ['You', 'Verify', 'Address'];
  return (
    <div className="flex items-center gap-3">
      {labels.map((l, i) => (
        <div key={l} className="flex items-center gap-3 flex-1 last:flex-none">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium transition-all',
                i < step
                  ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)]'
                  : i === step
                    ? 'bg-[color:var(--color-saffron)] text-[color:var(--color-ink)]'
                    : 'bg-[color:var(--color-ink)]/8 text-[color:var(--color-ink-soft)]/60',
              )}
            >
              {i < step ? (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={cn(
                'text-[11px] uppercase tracking-[0.12em] truncate',
                i === step ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-ink-soft)]/60',
              )}
            >
              {l}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div
              className={cn(
                'flex-1 h-px transition-colors',
                i < step ? 'bg-[color:var(--color-forest)]/40' : 'bg-[color:var(--color-ink)]/12',
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-5 py-4 focus-within:border-[color:var(--color-forest)] transition-colors">
      <label className="block text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/70">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function PrimaryButton({
  children,
  loading,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  loading: boolean;
  disabled: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-full px-5 py-4 rounded-2xl font-medium text-[15px] transition-colors flex items-center justify-center gap-2',
        !disabled
          ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)]'
          : 'bg-[color:var(--color-ink)]/8 text-[color:var(--color-ink-soft)]/50 cursor-not-allowed',
      )}
    >
      {loading ? (
        <>
          <Spinner />
          Working…
        </>
      ) : (
        <>
          {children}
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </>
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="animate-spin">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="28" strokeDashoffset="10" />
    </svg>
  );
}

function AddressPicker({
  society,
  setSociety,
  building,
  setBuilding,
  flat,
  setFlat,
}: {
  society: string | null;
  setSociety: (v: string) => void;
  building: Building | null;
  setBuilding: (b: Building | null) => void;
  flat: string;
  setFlat: (v: string) => void;
}) {
  const [open, setOpen] = useState<'society' | 'building' | null>(null);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const filteredSocs = MAGARPATTA_SOCIETIES.filter((s) =>
    s.name.toLowerCase().includes(q.toLowerCase()),
  );

  const filteredBlds = society
    ? getBuildings(society).filter((b) => b.name.toLowerCase().includes(q.toLowerCase()))
    : [];

  return (
    <div ref={ref} className="space-y-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen(open === 'society' ? null : 'society');
            setQ('');
          }}
          className="w-full text-left rounded-2xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-5 py-4 hover:border-[color:var(--color-forest)]/40 flex items-center justify-between"
        >
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/70">
              Society
            </div>
            <div
              className={cn(
                'mt-1 text-[16px] truncate',
                society ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-ink-soft)]/45',
              )}
            >
              {society ?? 'Select your society'}
            </div>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className={cn('shrink-0 ml-3 transition-transform', open === 'society' && 'rotate-180')}
          >
            <path d="M3.5 5.5L7 9l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open === 'society' && (
          <PickerPanel
            q={q}
            setQ={setQ}
            placeholder="Search Magarpatta societies…"
            items={filteredSocs.map((s) => ({
              key: s.name,
              label: s.name,
              sub: `${s.buildings.length} bldgs`,
            }))}
            selected={society}
            onPick={(v) => {
              setSociety(v);
              setBuilding(null);
              setFlat('');
              setOpen('building');
              setQ('');
            }}
          />
        )}
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-3">
        <div className="relative">
          <button
            type="button"
            disabled={!society}
            onClick={() => {
              if (!society) return;
              setOpen(open === 'building' ? null : 'building');
              setQ('');
            }}
            className={cn(
              'w-full text-left rounded-2xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-5 py-4 flex items-center justify-between',
              society ? 'hover:border-[color:var(--color-forest)]/40' : 'opacity-50 cursor-not-allowed',
            )}
          >
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/70">
                Building
              </div>
              <div
                className={cn(
                  'mt-1 text-[16px] truncate',
                  building ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-ink-soft)]/45',
                )}
              >
                {building?.name ?? (society ? 'Select' : '—')}
              </div>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className={cn('shrink-0 ml-3 transition-transform', open === 'building' && 'rotate-180')}
            >
              <path d="M3.5 5.5L7 9l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {open === 'building' && society && (
            <PickerPanel
              q={q}
              setQ={setQ}
              placeholder={`Search ${society} buildings…`}
              items={filteredBlds.map((b) => ({
                key: b.name,
                label: b.name,
                sub: `G+${b.floors - 1} · ${b.flatsPerFloor}/fl`,
              }))}
              selected={building?.name ?? null}
              onPick={(v) => {
                const b = getBuilding(society, v);
                if (b) setBuilding(b);
                setOpen(null);
                setQ('');
              }}
            />
          )}
        </div>

        <div
          className={cn(
            'rounded-2xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-5 py-4',
            !building && 'opacity-50',
          )}
        >
          <label className="block text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/70">
            Flat
          </label>
          <input
            disabled={!building}
            inputMode="numeric"
            maxLength={4}
            value={flat}
            onChange={(e) => setFlat(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder={building ? `${Math.max(1, Math.floor(building.floors / 2))}0${Math.min(building.flatsPerFloor, 2)}` : '—'}
            className="mt-1 w-full bg-transparent outline-none text-[16px] placeholder:text-[color:var(--color-ink-soft)]/40 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}

function PickerPanel({
  q,
  setQ,
  placeholder,
  items,
  selected,
  onPick,
}: {
  q: string;
  setQ: (v: string) => void;
  placeholder: string;
  items: Array<{ key: string; label: string; sub?: string }>;
  selected: string | null;
  onPick: (v: string) => void;
}) {
  return (
    <div className="absolute left-0 right-0 top-full mt-2 z-20 rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] shadow-[0_24px_60px_-20px_rgba(15,15,14,0.28)] overflow-hidden">
      <div className="p-2 border-b border-[color:var(--color-ink)]/8">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-[14px] bg-transparent outline-none placeholder:text-[color:var(--color-ink-soft)]/50"
        />
      </div>
      <ul className="max-h-72 overflow-y-auto py-1">
        {items.length === 0 && (
          <li className="px-4 py-3 text-[13px] text-[color:var(--color-ink-soft)]/70">No match.</li>
        )}
        {items.map((it) => (
          <li key={it.key}>
            <button
              type="button"
              onClick={() => onPick(it.key)}
              className={cn(
                'w-full text-left px-4 py-2.5 hover:bg-[color:var(--color-cream)] flex items-center justify-between gap-4',
                selected === it.key && 'bg-[color:var(--color-forest)]/5',
              )}
            >
              <span
                className={cn(
                  'flex-1 min-w-0 truncate text-[14px] font-medium text-[color:var(--color-ink)]',
                  selected === it.key && 'text-[color:var(--color-forest)]',
                )}
              >
                {it.label}
              </span>
              {it.sub && (
                <span className="shrink-0 text-[10.5px] uppercase tracking-[0.1em] text-[color:var(--color-ink-soft)]/60">
                  {it.sub}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
