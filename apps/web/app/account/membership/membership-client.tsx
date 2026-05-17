'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PlanRow {
  id: string;
  name: string;
  description: string | null;
  priceInr: number;
  cycleDays: number;
  includedDeliveries: number;
  postIncludedFeeInr: number;
}

interface TopUpRow {
  id: string;
  name: string;
  priceInr: number;
  addedDeliveries: number;
}

interface State {
  isActive: boolean;
  creditsLeft: number;
  creditsGranted: number;
  subscription: {
    id: string;
    planName: string;
    cycleStart: string;
    cycleEnd: string;
    includedDeliveries: number;
    postIncludedFeeInr: number;
  } | null;
}

type Intent =
  | { kind: 'plan'; planId: string; amount: number; title: string; subtitle: string }
  | { kind: 'topup'; topUpId: string; amount: number; title: string; subtitle: string };

function daysUntil(isoDate: string): number {
  const target = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
}

export function MembershipClient({
  initialState,
  plans,
  topUps,
}: {
  initialState: State;
  plans: PlanRow[];
  topUps: TopUpRow[];
}) {
  const router = useRouter();
  const [intent, setIntent] = useState<Intent | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function completePurchase(intent: Intent) {
    const body =
      intent.kind === 'plan'
        ? { action: 'subscribe', planId: intent.planId }
        : { action: 'topup', topUpId: intent.topUpId };
    const res = await fetch('/api/account/membership', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error ?? 'Purchase failed');
    router.refresh();
  }

  const sub = initialState.subscription;

  return (
    <div className="mt-10 space-y-10">
      {sub && (
        <section className="rounded-3xl border border-[color:var(--color-forest)]/30 bg-gradient-to-br from-[color:var(--color-forest)]/5 to-[color:var(--color-cream)] p-8">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-forest)]">Active plan</div>
          <h2 className="mt-2 font-serif text-[32px] leading-tight">
            {sub.planName}
          </h2>
          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 p-4">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]">Free deliveries left</div>
              <div className="mt-1 font-serif text-[40px] leading-none">{initialState.creditsLeft}</div>
              <div className="mt-1 text-[12px] text-[color:var(--color-ink-soft)]">of {initialState.creditsGranted} this cycle</div>
            </div>
            <div className="rounded-2xl bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 p-4">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]">Days remaining</div>
              <div className="mt-1 font-serif text-[40px] leading-none">{daysUntil(sub.cycleEnd)}</div>
              <div className="mt-1 text-[12px] text-[color:var(--color-ink-soft)]">cycle ends {new Date(sub.cycleEnd).toLocaleDateString('en-IN')}</div>
            </div>
            <div className="rounded-2xl bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 p-4">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]">After free deliveries</div>
              <div className="mt-1 font-serif text-[40px] leading-none">₹{sub.postIncludedFeeInr}</div>
              <div className="mt-1 text-[12px] text-[color:var(--color-ink-soft)]">per delivery, or recharge below</div>
            </div>
          </div>
        </section>
      )}

      {!sub && (
        <section>
          <h2 className="font-serif text-[26px]">Pick a plan</h2>
          <p className="mt-1 text-[13px] text-[color:var(--color-ink-soft)]">
            One purchase covers your first {plans[0]?.includedDeliveries ?? 20} deliveries this cycle.
          </p>
          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            {plans.length === 0 && (
              <p className="text-[13px] text-[color:var(--color-ink-soft)] italic col-span-2">
                No plans available right now. Check back later.
              </p>
            )}
            {plans.map((p) => (
              <div key={p.id} className="rounded-2xl border border-[color:var(--color-ink)]/15 bg-[color:var(--color-paper)] p-6 flex flex-col">
                <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">Plan</div>
                <h3 className="mt-1 font-serif text-[22px]">{p.name}</h3>
                {p.description && <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-soft)]">{p.description}</p>}
                <div className="mt-4 font-serif text-[40px] leading-none">₹{p.priceInr}</div>
                <ul className="mt-4 space-y-1.5 text-[13px]">
                  <li>✓ {p.includedDeliveries} free deliveries</li>
                  <li>✓ {p.cycleDays}-day cycle</li>
                  <li>✓ ₹{p.postIncludedFeeInr}/delivery after that</li>
                </ul>
                <button
                  onClick={() =>
                    setIntent({
                      kind: 'plan',
                      planId: p.id,
                      amount: p.priceInr,
                      title: `Activate ${p.name}`,
                      subtitle: `${p.includedDeliveries} free deliveries · ${p.cycleDays}-day cycle`,
                    })
                  }
                  className="mt-6 rounded-full bg-[color:var(--color-forest)] text-white px-5 py-2.5 text-[13.5px] font-medium hover:opacity-90"
                >
                  Activate this plan
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {sub && topUps.length > 0 && (
        <section>
          <h2 className="font-serif text-[26px]">Recharge</h2>
          <p className="mt-1 text-[13px] text-[color:var(--color-ink-soft)]">
            Add credits to this cycle. Cycle end date doesn't move — credits expire when the cycle does.
          </p>
          <div className="mt-5 grid sm:grid-cols-3 gap-4">
            {topUps.map((t) => (
              <div key={t.id} className="rounded-2xl border border-[color:var(--color-ink)]/15 bg-[color:var(--color-paper)] p-5">
                <div className="font-serif text-[20px]">{t.name}</div>
                <div className="mt-1 text-[12px] text-[color:var(--color-ink-soft)]">+{t.addedDeliveries} deliveries</div>
                <div className="mt-3 font-medium text-[18px]">₹{t.priceInr}</div>
                <button
                  onClick={() =>
                    setIntent({
                      kind: 'topup',
                      topUpId: t.id,
                      amount: t.priceInr,
                      title: `Recharge — ${t.name}`,
                      subtitle: `+${t.addedDeliveries} deliveries on your current cycle`,
                    })
                  }
                  className="mt-4 w-full rounded-md bg-[color:var(--color-forest)]/95 text-white px-3 py-2 text-[13px] hover:opacity-90"
                >
                  Recharge
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {error && (
        <div className="rounded-lg border border-[color:var(--color-terracotta)]/30 bg-[color:var(--color-terracotta)]/5 px-4 py-3 text-[13px] text-[color:var(--color-terracotta)]">
          {error}
        </div>
      )}

      {intent && (
        <PaymentDialog
          intent={intent}
          onClose={() => setIntent(null)}
          onCapture={async () => {
            try {
              await completePurchase(intent);
              setIntent(null);
              setError(null);
            } catch (e) {
              setError((e as Error).message);
              setIntent(null);
            }
          }}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// Payment dialog
// Mirrors the checkout payment UX: Card / UPI / Net Banking with the same
// validation rules and "processing" animation. No real PG is wired up —
// the steps simulate a redirect, then the on-success callback fires the
// actual grant API call.
// -----------------------------------------------------------------------

type PayMethod = 'CARD' | 'UPI' | 'NET_BANKING';

const BANKS = ['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'Yes'];

function PaymentDialog({
  intent,
  onClose,
  onCapture,
}: {
  intent: Intent;
  onClose: () => void;
  onCapture: () => Promise<void>;
}) {
  const [method, setMethod] = useState<PayMethod>('CARD');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bank, setBank] = useState(BANKS[0]);
  const [processing, setProcessing] = useState(false);
  const [processingLine, setProcessingLine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (method === 'CARD') {
      const digits = cardNumber.replace(/\s/g, '');
      if (digits.length !== 16 || !/^\d+$/.test(digits)) return 'Enter a valid 16-digit card number';
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) return 'Expiry must be MM/YY';
      if (cardCvv.length !== 3) return 'CVV must be 3 digits';
      if (cardName.trim().length < 2) return 'Enter the name on your card';
    } else if (method === 'UPI') {
      if (!/^[\w.-]+@[\w]+$/.test(upiId.trim())) return 'Enter a valid UPI ID (e.g. you@okhdfc)';
    }
    return null;
  }

  async function pay() {
    const v = validate();
    if (v) { setError(v); return; }
    setError(null);
    setProcessing(true);

    const steps =
      method === 'CARD'
        ? ['Encrypting card details…', 'Authorising with your bank…', 'Payment captured.']
        : method === 'UPI'
          ? [`Requesting UPI approval from ${upiId}…`, 'Awaiting your confirmation…', 'Payment received.']
          : [`Redirecting to ${bank} Bank…`, 'Authorising transaction…', 'Payment received.'];

    for (const s of steps) {
      setProcessingLine(s);
      await new Promise((r) => setTimeout(r, 900));
    }

    await onCapture();
  }

  return (
    <div className="fixed inset-0 z-50 bg-[color:var(--color-ink)]/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-[520px] rounded-3xl bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 shadow-2xl overflow-hidden">
        {processing ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--color-forest)]/10">
              <span className="inline-block h-3 w-3 rounded-full bg-[color:var(--color-forest)] animate-pulse" />
            </div>
            <h3 className="mt-4 font-serif text-[22px]">Processing your payment</h3>
            <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)] min-h-[1.2em]">{processingLine}</p>
            <div className="mt-4 text-[11px] text-[color:var(--color-ink-soft)]/70">₹{intent.amount} via {method.replace('_', ' ')}</div>
          </div>
        ) : (
          <>
            <div className="px-6 pt-6 pb-4 border-b border-[color:var(--color-ink)]/8">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Secure payment</div>
              <h3 className="mt-1 font-serif text-[24px] leading-tight">{intent.title}</h3>
              <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-soft)]">{intent.subtitle}</p>
              <div className="mt-3 inline-flex items-baseline gap-1.5 rounded-full bg-[color:var(--color-forest)]/8 px-3 py-1.5">
                <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-forest)]">Total</span>
                <span className="font-serif text-[20px]">₹{intent.amount}</span>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(['CARD', 'UPI', 'NET_BANKING'] as PayMethod[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={
                      'rounded-lg border px-3 py-2 text-[12px] ' +
                      (method === m
                        ? 'border-[color:var(--color-forest)] bg-[color:var(--color-forest)]/8 text-[color:var(--color-forest)]'
                        : 'border-[color:var(--color-ink)]/15 hover:border-[color:var(--color-forest)]/40')
                    }
                  >
                    {m === 'CARD' ? 'Card' : m === 'UPI' ? 'UPI' : 'Net banking'}
                  </button>
                ))}
              </div>

              {method === 'CARD' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/[^0-9 ]/g, '').slice(0, 19))}
                    placeholder="Card number"
                    className="w-full rounded-md border border-[color:var(--color-ink)]/15 px-3 py-2 text-[14px] outline-none focus:border-[color:var(--color-forest)]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value.replace(/[^0-9/]/g, '').slice(0, 5))}
                      placeholder="MM/YY"
                      className="rounded-md border border-[color:var(--color-ink)]/15 px-3 py-2 text-[14px] outline-none focus:border-[color:var(--color-forest)]"
                    />
                    <input
                      type="text"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                      placeholder="CVV"
                      className="rounded-md border border-[color:var(--color-ink)]/15 px-3 py-2 text-[14px] outline-none focus:border-[color:var(--color-forest)]"
                    />
                  </div>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Name on card"
                    className="w-full rounded-md border border-[color:var(--color-ink)]/15 px-3 py-2 text-[14px] outline-none focus:border-[color:var(--color-forest)]"
                  />
                </div>
              )}

              {method === 'UPI' && (
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="you@okhdfc"
                  className="w-full rounded-md border border-[color:var(--color-ink)]/15 px-3 py-2 text-[14px] outline-none focus:border-[color:var(--color-forest)]"
                />
              )}

              {method === 'NET_BANKING' && (
                <select
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full rounded-md border border-[color:var(--color-ink)]/15 px-3 py-2 text-[14px] outline-none focus:border-[color:var(--color-forest)]"
                >
                  {BANKS.map((b) => (
                    <option key={b} value={b}>{b} Bank</option>
                  ))}
                </select>
              )}

              {error && <p className="text-[12.5px] text-[color:var(--color-terracotta)]">{error}</p>}
            </div>

            <div className="px-6 pb-6 flex items-center justify-between gap-3">
              <button onClick={onClose} className="text-[13px] text-[color:var(--color-ink-soft)] hover:underline">
                Cancel
              </button>
              <button
                onClick={pay}
                className="rounded-full bg-[color:var(--color-forest)] text-white px-5 py-2.5 text-[13.5px] font-medium hover:opacity-90"
              >
                Pay ₹{intent.amount}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
