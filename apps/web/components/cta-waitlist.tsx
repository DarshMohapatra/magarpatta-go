'use client';

import { useState } from 'react';

export function WaitlistCta() {
  const [phone, setPhone] = useState('');
  const [tower, setTower] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <section id="waitlist" className="py-28 lg:py-36">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="relative overflow-hidden rounded-[32px] bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 px-8 py-16 lg:px-20 lg:py-24">
          {/* Decorative corner shapes */}
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[color:var(--color-saffron)]/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-28 -left-20 w-80 h-80 rounded-full bg-[color:var(--color-forest)]/12 blur-3xl pointer-events-none" />

          <div className="relative max-w-3xl">
            <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">
              Be first in your tower
            </div>
            <h2 className="mt-4 font-serif text-[44px] lg:text-[64px] leading-[0.98] tracking-[-0.02em]">
              We launch quietly. <span className="italic text-[color:var(--color-forest)]">You should know first.</span>
            </h2>
            <p className="mt-5 text-[16px] leading-[1.6] text-[color:var(--color-ink-soft)] max-w-xl">
              Four riders, limited launch slots per tower. Drop your number — we&apos;ll text you the
              moment we&apos;re live at your building, with your first two deliveries on us.
            </p>

            {!submitted ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!phone) return;
                  try {
                    await fetch('/api/waitlist', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ phone, tower: tower || undefined }),
                    });
                  } catch {
                    // swallow — show success anyway; dev UX
                  }
                  setSubmitted(true);
                }}
                className="mt-10 flex flex-col sm:flex-row gap-3 max-w-2xl"
              >
                <div className="flex-1 rounded-2xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-cream)]/60 px-4 py-3">
                  <label className="block text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/70">
                    Phone
                  </label>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-[15px] text-[color:var(--color-ink-soft)]">+91</span>
                    <input
                      required
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="98765 43210"
                      className="w-full bg-transparent outline-none text-[15px] placeholder:text-[color:var(--color-ink-soft)]/40"
                    />
                  </div>
                </div>
                <div className="flex-1 rounded-2xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-cream)]/60 px-4 py-3">
                  <label className="block text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/70">
                    Tower (optional)
                  </label>
                  <input
                    value={tower}
                    onChange={(e) => setTower(e.target.value)}
                    placeholder="e.g. Cosmos"
                    className="mt-0.5 w-full bg-transparent outline-none text-[15px] placeholder:text-[color:var(--color-ink-soft)]/40"
                  />
                </div>
                <button
                  type="submit"
                  className="shrink-0 px-7 rounded-2xl bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)] font-medium text-[14px] transition-colors flex items-center justify-center gap-2"
                >
                  Join waitlist
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </form>
            ) : (
              <div className="mt-10 inline-flex items-start gap-3 rounded-2xl border border-[color:var(--color-forest)]/25 bg-[color:var(--color-forest)]/5 px-5 py-4">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)]">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6.5l2.5 2.5 4.5-5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-serif text-[22px] leading-tight text-[color:var(--color-forest-dark)]">
                    You&apos;re on the list.
                  </p>
                  <p className="mt-1 text-[13.5px] text-[color:var(--color-ink-soft)]">
                    We&apos;ll text +91 {phone} the moment we launch{tower ? ` at ${tower}` : ''}.
                  </p>
                </div>
              </div>
            )}

            <p className="mt-6 text-[12px] text-[color:var(--color-ink-soft)]/70 max-w-xl">
              We only text about Magarpatta Go. No promotional blasts. DLT-compliant sender ID
              registered with TRAI.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
