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
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buyPlan(planId: string) {
    setBusy(`plan:${planId}`);
    setError(null);
    try {
      const res = await fetch('/api/account/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'subscribe', planId }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Could not subscribe');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setBusy(null);
    }
  }

  async function buyTopUp(topUpId: string) {
    setBusy(`topup:${topUpId}`);
    setError(null);
    try {
      const res = await fetch('/api/account/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'topup', topUpId }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Could not add top-up');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setBusy(null);
    }
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
                  onClick={() => buyPlan(p.id)}
                  disabled={busy === `plan:${p.id}`}
                  className="mt-6 rounded-full bg-[color:var(--color-forest)] text-white px-5 py-2.5 text-[13.5px] font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {busy === `plan:${p.id}` ? 'Activating…' : 'Activate this plan'}
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
                  onClick={() => buyTopUp(t.id)}
                  disabled={busy === `topup:${t.id}`}
                  className="mt-4 w-full rounded-md bg-[color:var(--color-forest)]/95 text-white px-3 py-2 text-[13px] hover:opacity-90 disabled:opacity-50"
                >
                  {busy === `topup:${t.id}` ? 'Adding…' : 'Recharge'}
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
    </div>
  );
}
