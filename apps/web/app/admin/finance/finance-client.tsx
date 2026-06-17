'use client';

import { useEffect, useState } from 'react';
import { PartnerPageHero } from '@/components/partner/partner-page-hero';

interface FinanceData {
  gmvInr: number;
  grossMerchandiseInr: number;
  deliveryCollectedInr: number;
  discountGivenInr: number;
  platformCommissionInr: number;
  orderCount: number;
  byDay: Array<{ date: string; gmv: number; orders: number }>;
  vendorRows: Array<{ vendorId: string; vendorName: string; salesInr: number; commissionInr: number }>;
}

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
  vendor: {
    id: string;
    name: string;
    slug: string;
    upiId?: string | null;
    bankAccountNumber?: string | null;
    bankIfsc?: string | null;
    ownerPhone?: string | null;
  };
}

interface SettlementData {
  payable: SettlementRow[];
  paid: SettlementRow[];
  totals: {
    payableCount: number;
    payableInr: number;
    paidCountLast90: number;
    paidInrLast90: number;
  };
}

type Tab = 'overview' | 'settlements';

export function AdminFinanceClient() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [settlements, setSettlements] = useState<SettlementData | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/finance', { cache: 'no-store' }).then((r) => r.json()).then((j) => { if (j.ok) setData(j); });
  }, []);

  async function loadSettlements() {
    const j = await fetch('/api/admin/settlements', { cache: 'no-store' }).then((r) => r.json());
    if (j.ok) setSettlements(j);
  }

  useEffect(() => {
    if (tab === 'settlements' && !settlements) {
      void loadSettlements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function markPaid(row: SettlementRow) {
    const paymentRef = prompt(`Payment reference for ${row.vendor.name} (₹${row.payableInr.toLocaleString('en-IN')})?\n\nEnter the UPI txn id / UTR / NEFT reference:`);
    if (!paymentRef) return;
    setBusyId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/settlements/${row.id}/paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentRef }),
      });
      const j = await res.json();
      if (!j.ok) {
        setError(j.error ?? 'Could not mark as paid');
        return;
      }
      await loadSettlements();
    } finally {
      setBusyId(null);
    }
  }

  async function regenerateYesterday() {
    setError(null);
    try {
      const res = await fetch('/api/cron/settlements', { method: 'POST' });
      const j = await res.json();
      if (!j.ok) {
        setError(j.error ?? 'Could not regenerate settlements');
        return;
      }
      await loadSettlements();
    } catch {
      setError('Network error while regenerating');
    }
  }

  if (!data) return <div className="text-[13px] text-[color:var(--color-muted)]">Loading…</div>;

  return (
    <div>
      <PartnerPageHero
        eyebrow="Finance"
        title="Platform economics."
        summary="14-day GMV, commission, payouts & settlements"
      />

      <div className="mt-5 flex gap-1 border-b border-[color:var(--color-foreground)]/10">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>Overview · 14 days</TabButton>
        <TabButton active={tab === 'settlements'} onClick={() => setTab('settlements')}>Vendor settlements</TabButton>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-[color:var(--color-terracotta)]/30 bg-[color:var(--color-terracotta)]/10 px-4 py-2.5 text-[13px] text-[color:var(--color-terracotta)]">
          {error}
        </div>
      )}

      {tab === 'overview' && <OverviewTab data={data} />}
      {tab === 'settlements' && (
        <SettlementsTab
          data={settlements}
          busyId={busyId}
          onMarkPaid={markPaid}
          onRegenerate={regenerateYesterday}
        />
      )}
    </div>
  );
}

function OverviewTab({ data }: { data: FinanceData }) {
  const maxGmv = Math.max(1, ...data.byDay.map((d) => d.gmv));
  return (
    <>
      <div className="mt-6 grid md:grid-cols-4 gap-4">
        <Stat label="GMV" value={`₹${data.gmvInr.toLocaleString('en-IN')}`} note={`${data.orderCount} delivered`} highlight />
        <Stat label="Gross merchandise" value={`₹${data.grossMerchandiseInr.toLocaleString('en-IN')}`} note="paid to vendors before commission" />
        <Stat label="Delivery collected" value={`₹${data.deliveryCollectedInr.toLocaleString('en-IN')}`} note="customer-side fee" />
        <Stat label="Platform commission" value={`₹${data.platformCommissionInr.toLocaleString('en-IN')}`} note="vendor take-rate" />
      </div>

      <section className="mt-8 rounded-2xl border border-[color:var(--color-foreground)]/10 bg-[color:var(--color-surface)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[color:var(--color-foreground)]/8 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">By day</div>
        {data.byDay.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-[color:var(--color-muted)]">No deliveries in the last 14 days.</div>
        ) : (
          <ul className="divide-y divide-[color:var(--color-foreground)]/8">
            {data.byDay.map((d) => (
              <li key={d.date} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[13px] font-medium">{formatDay(d.date)}</div>
                  <div className="text-[13px]">
                    <span className="text-[color:var(--color-primary)] font-display text-[16px]">₹{d.gmv.toLocaleString('en-IN')}</span>
                    <span className="ml-2 text-[11px] text-[color:var(--color-muted)]/70">{d.orders} order{d.orders === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-[color:var(--color-foreground)]/8 overflow-hidden">
                  <div className="h-full bg-[color:var(--color-primary)]" style={{ width: `${(d.gmv / maxGmv) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-[color:var(--color-foreground)]/10 bg-[color:var(--color-surface)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[color:var(--color-foreground)]/8 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">By vendor</div>
        {data.vendorRows.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-[color:var(--color-muted)]">No vendor sales in the last 14 days.</div>
        ) : (
          <ul className="divide-y divide-[color:var(--color-foreground)]/8">
            {data.vendorRows.map((r) => (
              <li key={r.vendorId} className="px-5 py-3 flex items-center justify-between gap-3 text-[13px]">
                <div className="font-medium truncate">{r.vendorName}</div>
                <div className="text-right text-[12.5px]">
                  <div><span className="text-[color:var(--color-muted)]/70">Sales</span> <span className="font-display text-[color:var(--color-primary)]">₹{r.salesInr.toLocaleString('en-IN')}</span></div>
                  <div className="text-[11.5px] text-[color:var(--color-muted)]/70">Commission ₹{r.commissionInr.toLocaleString('en-IN')}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function SettlementsTab({
  data, busyId, onMarkPaid, onRegenerate,
}: {
  data: SettlementData | null;
  busyId: string | null;
  onMarkPaid: (row: SettlementRow) => void;
  onRegenerate: () => void;
}) {
  if (!data) return <div className="mt-6 text-[13px] text-[color:var(--color-muted)]">Loading settlements…</div>;
  return (
    <>
      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        <Stat label="Payable now" value={`₹${data.totals.payableInr.toLocaleString('en-IN')}`} note={`${data.totals.payableCount} row${data.totals.payableCount === 1 ? '' : 's'} awaiting payment`} highlight />
        <Stat label="Paid · last 90 days" value={`₹${data.totals.paidInrLast90.toLocaleString('en-IN')}`} note={`${data.totals.paidCountLast90} settlement${data.totals.paidCountLast90 === 1 ? '' : 's'}`} />
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={onRegenerate}
          className="rounded-lg border border-[color:var(--color-foreground)]/15 px-3 py-1.5 text-[12px] hover:border-[color:var(--color-primary)]/40"
        >
          Regenerate yesterday's settlements
        </button>
      </div>

      <section className="mt-6 rounded-2xl border border-[color:var(--color-foreground)]/10 bg-[color:var(--color-surface)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[color:var(--color-foreground)]/8 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">
          Payable — owed to vendors
        </div>
        {data.payable.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-[color:var(--color-muted)]">All settlements paid out.</div>
        ) : (
          <ul className="divide-y divide-[color:var(--color-foreground)]/8">
            {data.payable.map((r) => (
              <li key={r.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13.5px] font-medium">{r.vendor.name}</div>
                  <div className="text-[11.5px] text-[color:var(--color-muted)]/75">
                    {formatPeriod(r.periodStart, r.periodEnd)} · {r.orderCount} order{r.orderCount === 1 ? '' : 's'} · gross ₹{r.grossInr.toLocaleString('en-IN')} · commission ₹{r.commissionInr.toLocaleString('en-IN')} ({r.commissionPct}%)
                  </div>
                  <div className="mt-1 text-[11px] text-[color:var(--color-muted)]/65">
                    {r.vendor.upiId ? `UPI ${r.vendor.upiId}` : null}
                    {r.vendor.upiId && (r.vendor.bankAccountNumber || r.vendor.bankIfsc) ? ' · ' : null}
                    {r.vendor.bankAccountNumber ? `••• ${r.vendor.bankAccountNumber.slice(-4)} ` : null}
                    {r.vendor.bankIfsc ? `(${r.vendor.bankIfsc})` : null}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-display text-[18px] text-[color:var(--color-primary)]">₹{r.payableInr.toLocaleString('en-IN')}</div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-muted)]/65">net payable</div>
                  </div>
                  <button
                    onClick={() => onMarkPaid(r)}
                    disabled={busyId === r.id}
                    className="rounded-full bg-[color:var(--color-primary)] text-[color:var(--color-background)] px-3.5 py-1.5 text-[12.5px] font-medium hover:bg-[color:var(--color-primary)] disabled:opacity-50"
                  >
                    {busyId === r.id ? 'Saving…' : 'Mark paid'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-[color:var(--color-foreground)]/10 bg-[color:var(--color-surface)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[color:var(--color-foreground)]/8 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">
          Paid history · last 90 days
        </div>
        {data.paid.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-[color:var(--color-muted)]">No payouts settled yet.</div>
        ) : (
          <ul className="divide-y divide-[color:var(--color-foreground)]/8">
            {data.paid.map((r) => (
              <li key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{r.vendor.name}</div>
                  <div className="text-[11.5px] text-[color:var(--color-muted)]/70">
                    {formatPeriod(r.periodStart, r.periodEnd)} · paid {r.paidAt ? new Date(r.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—'}
                    {r.paymentRef && <span> · ref {r.paymentRef}</span>}
                  </div>
                </div>
                <div className="font-display text-[16px] text-[color:var(--color-primary)] shrink-0">₹{r.payableInr.toLocaleString('en-IN')}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        'px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ' +
        (active
          ? 'border-[color:var(--color-primary)] text-[color:var(--color-primary)]'
          : 'border-transparent text-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]')
      }
    >
      {children}
    </button>
  );
}

function Stat({ label, value, note, highlight }: { label: string; value: string; note?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 border ${highlight ? 'border-[color:var(--color-primary)]/30 bg-gradient-to-br from-[color:var(--color-primary)]/8 to-[color:var(--color-moss)]/4' : 'border-[color:var(--color-foreground)]/10 bg-[color:var(--color-surface)]'}`}>
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-muted)]/70">{label}</div>
      <div className="mt-1.5 font-display text-[26px] leading-none">{value}</div>
      {note && <div className="mt-1.5 text-[11.5px] text-[color:var(--color-muted)]/70">{note}</div>}
    </div>
  );
}

function formatDay(iso: string): string {
  return new Date(iso + 'T00:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' });
}

function formatPeriod(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' });
  const diffMs = end.getTime() - start.getTime();
  if (diffMs > 0 && diffMs <= 26 * 60 * 60 * 1000) return fmt(start);
  return `${fmt(start)} → ${fmt(new Date(end.getTime() - 1))}`;
}
