'use client';

import { useEffect, useState } from 'react';

interface SettlementRow {
  id: string;
  periodStart: string;
  periodEnd: string;
  orderCount: number;
  grossInr: number;
  commissionPct: number;
  commissionInr: number;
  payableInr: number;
  status: 'PAYABLE' | 'PAID';
  paidAt: string | null;
  paymentRef: string | null;
  notes: string | null;
}

interface Data {
  commissionPct: number;
  bankSnapshot: {
    upiId: string | null;
    bankAccountName: string | null;
    accountLast4: string | null;
    bankIfsc: string | null;
  } | null;
  payable: SettlementRow[];
  history: SettlementRow[];
  totals: {
    totalPayableInr: number;
    totalGrossInr: number;
    totalCommissionInr: number;
    paidLast90Inr: number;
    payableCount: number;
  };
}

export function VendorPayoutsClient() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch('/api/vendor/payouts', { cache: 'no-store' }).then((r) => r.json()).then((j) => { if (j.ok) setData(j); });
  }, []);

  if (!data) return <div className="text-[13px] text-[color:var(--color-muted)]">Loading…</div>;

  return (
    <div className="space-y-8">
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Settlements</div>
        <h1 className="mt-2 font-display text-[32px] sm:text-[40px] leading-[1.02] tracking-[-0.02em]">
          Earnings, <span className="italic text-[color:var(--color-primary)]">settled.</span>
        </h1>
        <p className="mt-2 text-[12.5px] text-[color:var(--color-muted)]">
          Commission · {data.commissionPct}% · deducted from gross sales. Payouts are reconciled per day and paid out by the platform team.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Payable now" value={`₹${data.totals.totalPayableInr.toLocaleString('en-IN')}`} note={`${data.totals.payableCount} period${data.totals.payableCount === 1 ? '' : 's'} pending`} highlight />
        <Stat label="Gross (pending)" value={`₹${data.totals.totalGrossInr.toLocaleString('en-IN')}`} note={`Commission ₹${data.totals.totalCommissionInr.toLocaleString('en-IN')}`} />
        <Stat label="Paid · last 90 days" value={`₹${data.totals.paidLast90Inr.toLocaleString('en-IN')}`} note={`${data.history.length} payout${data.history.length === 1 ? '' : 's'}`} />
      </div>

      {data.bankSnapshot && (
        <section className="rounded-2xl border border-[color:var(--color-foreground)]/10 bg-[color:var(--color-surface)] p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-2">Payout destination</div>
          <div className="grid sm:grid-cols-3 gap-3 text-[13px]">
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-muted)]/70">Beneficiary</div>
              <div className="font-medium">{data.bankSnapshot.bankAccountName ?? '—'}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-muted)]/70">Account</div>
              <div className="font-medium">
                {data.bankSnapshot.accountLast4 ? `••• ${data.bankSnapshot.accountLast4}` : '—'}
                {data.bankSnapshot.bankIfsc && <span className="ml-2 text-[color:var(--color-muted)]/70">{data.bankSnapshot.bankIfsc}</span>}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-muted)]/70">UPI</div>
              <div className="font-medium">{data.bankSnapshot.upiId ?? '—'}</div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-[color:var(--color-muted)]/70">
            To update your payout destination, contact platform support — bank changes are verified manually.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-[color:var(--color-foreground)]/10 bg-[color:var(--color-surface)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[color:var(--color-foreground)]/8 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">
          Payable — owed to you
        </div>
        {data.payable.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-[color:var(--color-muted)]">Nothing pending — all caught up.</div>
        ) : (
          <ul className="divide-y divide-[color:var(--color-foreground)]/8">
            {data.payable.map((r) => (
              <li key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{formatPeriod(r.periodStart, r.periodEnd)}</div>
                  <div className="text-[11.5px] text-[color:var(--color-muted)]/70">
                    {r.orderCount} order{r.orderCount === 1 ? '' : 's'} · gross ₹{r.grossInr.toLocaleString('en-IN')} · commission ₹{r.commissionInr.toLocaleString('en-IN')} ({r.commissionPct}%)
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-[18px] text-[color:var(--color-primary)]">₹{r.payableInr.toLocaleString('en-IN')}</div>
                  <div className="text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-muted)]/65">net payable</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[color:var(--color-foreground)]/10 bg-[color:var(--color-surface)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[color:var(--color-foreground)]/8 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">
          Paid history · last 90 days
        </div>
        {data.history.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-[color:var(--color-muted)]">No payouts have been settled yet.</div>
        ) : (
          <ul className="divide-y divide-[color:var(--color-foreground)]/8">
            {data.history.map((r) => (
              <li key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{formatPeriod(r.periodStart, r.periodEnd)}</div>
                  <div className="text-[11.5px] text-[color:var(--color-muted)]/70">
                    Paid {r.paidAt ? new Date(r.paidAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—'}
                    {r.paymentRef && <span> · ref {r.paymentRef}</span>}
                  </div>
                </div>
                <div className="font-display text-[16px] text-[color:var(--color-primary)] shrink-0">₹{r.payableInr.toLocaleString('en-IN')}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, note, highlight }: { label: string; value: string; note?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 border ${highlight ? 'border-[color:var(--color-primary)]/30 bg-gradient-to-br from-[color:var(--color-primary)]/8 to-[color:var(--color-moss)]/4' : 'border-[color:var(--color-foreground)]/10 bg-[color:var(--color-surface)]'}`}>
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-muted)]/70">{label}</div>
      <div className="mt-1.5 font-display text-[28px] leading-none">{value}</div>
      {note && <div className="mt-1.5 text-[11.5px] text-[color:var(--color-muted)]/70">{note}</div>}
    </div>
  );
}

function formatPeriod(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' });
  // Single calendar day = collapse to one label
  const diffMs = end.getTime() - start.getTime();
  if (diffMs > 0 && diffMs <= 26 * 60 * 60 * 1000) return fmt(start);
  return `${fmt(start)} → ${fmt(new Date(end.getTime() - 1))}`;
}
