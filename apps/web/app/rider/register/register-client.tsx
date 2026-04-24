'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Form {
  name: string;
  phone: string;
  email: string;
  aadhaarNumber: string;
  dlNumber: string;
  vehicleType: string;
  vehicleNumber: string;
}

const EMPTY: Form = {
  name: '', phone: '', email: '',
  aadhaarNumber: '', dlNumber: '',
  vehicleType: 'motorcycle', vehicleNumber: '',
};

export function RiderRegisterClient() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/rider/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!j.ok) { setErr(j.error ?? 'Could not submit'); setBusy(false); return; }
      setDone(true);
    } catch {
      setErr('Network error.'); setBusy(false);
    }
  }

  if (done) {
    return (
      <section className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[520px] text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--color-forest)]/10 text-[color:var(--color-forest)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h1 className="font-serif text-[36px] leading-[1.02] tracking-[-0.02em]">
            Application in, <span className="italic text-[color:var(--color-forest)]">neighbour.</span>
          </h1>
          <p className="mt-3 text-[14px] text-[color:var(--color-ink-soft)]">
            Ops will call you on <span className="font-medium text-[color:var(--color-ink)]">+91 {form.phone}</span> within a day
            to verify your documents. Once you&apos;re approved you can sign in with your phone number.
          </p>
          <button
            onClick={() => router.push('/rider/signin')}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-6 py-3 text-[13.5px] font-medium hover:bg-[color:var(--color-forest-dark)]"
          >
            Back to sign in
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-[560px]">
        <Link href="/rider/signin" className="inline-flex items-center gap-1.5 text-[12.5px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)]">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 6H2m0 0l3.5 3.5M2 6l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back to sign in
        </Link>

        <div className="mt-4 inline-flex items-center gap-2.5">
          <span className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-forest)]">Rider application</span>
        </div>
        <h1 className="mt-2 font-serif text-[36px] sm:text-[44px] leading-[1.02] tracking-[-0.02em]">
          Put yourself on the <span className="italic text-[color:var(--color-forest)]">roster.</span>
        </h1>
        <p className="mt-3 text-[13.5px] text-[color:var(--color-ink-soft)] leading-[1.55]">
          Ops verifies DL + RC in person before first shift. Expect a 15-minute call within 24 hours of applying.
        </p>

        <form onSubmit={submit} className="mt-8 rounded-3xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6 sm:p-8 space-y-5">
          <Field label="Full name">
            <input required value={form.name} onChange={(e) => set('name', e.target.value)} className={inp} placeholder="e.g. Amit Patil" />
          </Field>
          <Field label="Phone (+91)">
            <input
              required
              inputMode="numeric"
              maxLength={10}
              value={form.phone}
              onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              className={inp}
              placeholder="10-digit number"
            />
          </Field>
          <Field label="Email (optional)">
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inp} />
          </Field>

          <div className="pt-3 border-t border-[color:var(--color-ink)]/8 grid sm:grid-cols-2 gap-4">
            <Field label="Aadhaar (12-digit)">
              <input
                inputMode="numeric"
                maxLength={12}
                value={form.aadhaarNumber}
                onChange={(e) => set('aadhaarNumber', e.target.value.replace(/\D/g, '').slice(0, 12))}
                className={inp}
                placeholder="Only last 4 visible to admin"
              />
            </Field>
            <Field label="Driving licence">
              <input
                value={form.dlNumber}
                onChange={(e) => set('dlNumber', e.target.value.toUpperCase())}
                className={inp}
                placeholder="MH12 2019 0021"
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Vehicle type">
              <select value={form.vehicleType} onChange={(e) => set('vehicleType', e.target.value)} className={inp}>
                <option value="bicycle">Bicycle</option>
                <option value="scooter">Scooter</option>
                <option value="motorcycle">Motorcycle</option>
              </select>
            </Field>
            <Field label="Vehicle number">
              <input
                value={form.vehicleNumber}
                onChange={(e) => set('vehicleNumber', e.target.value.toUpperCase())}
                className={inp}
                placeholder="MH12 AB 1234"
              />
            </Field>
          </div>

          <p className="text-[11.5px] text-[color:var(--color-ink-soft)]/70 leading-[1.55]">
            By submitting, you agree to let Magarpatta Go verify your DL and vehicle RC. We never share Aadhaar
            with anyone outside our ops team.
          </p>

          {err && (
            <div className="rounded-xl bg-[color:var(--color-terracotta)]/10 border border-[color:var(--color-terracotta)]/25 px-4 py-3 text-[13px] text-[color:var(--color-terracotta-dark)]">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !form.name || form.phone.length !== 10}
            className="w-full rounded-xl bg-[color:var(--color-forest)] text-[color:var(--color-cream)] py-3.5 text-[14.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? 'Submitting…' : 'Submit for verification'}
          </button>
        </form>
      </div>
    </section>
  );
}

const inp = 'mt-1 w-full rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-2.5 text-[14px] outline-none focus:border-[color:var(--color-forest)]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">{label}</span>
      {children}
    </label>
  );
}
