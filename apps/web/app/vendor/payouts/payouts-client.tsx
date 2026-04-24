'use client';

import { useEffect, useState } from 'react';

interface DayRow { date: string; orders: number; salesInr: number; commissionInr: number; payoutInr: number }
interface Data {
  commissionPct: number;
  totalSalesInr: number;
  totalCommissionInr: number;
  totalPayoutInr: number;
  byDay: DayRow[];
  recentOrders: Array<{ id: string; subtotalInr: number; totalInr: number; deliveredAt: string | null; items: Array<{ name: string; quantity: number }> }>;
}

export function VendorPayoutsClient() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch('/api/vendor/payouts', { cache: 'no-store' }).then((r) => r.json()).then((j) => { if (j.ok) setData(j); });
  }, []);

  if (!data) return <div className="text-[13px] text-[color:var(--color-ink-soft)]">Loading…</div>;

  const maxSales = Math.max(1, ...data.byDay.map((d) => d.salesInr));

  return (
    <div className="space-y-8">
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Payouts · last 14 days</div>
        <h1 className="mt-2 font-serif text-[32px] sm:text-[40px] leading-[1.02] tracking-[-0.02em]">
          Earnings, <span className="italic text-[color:var(--color-forest)]">settled.</span>
        </h1>
        <p className="mt-2 text-[12.5px] text-[color:var(--color-ink-soft)]">
          Commission · {data.commissionPct}% · deducted on delivered orders only. Payouts land in your bank nightly.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Gross sales" value={`₹${data.totalSalesInr.toLocaleString('en-IN')}`} />
        <Stat label="Commission" value={`₹${data.totalCommissionInr.toLocaleString('en-IN')}`} note={`${data.commissionPct}% of gross`} />
        <Stat label="Net payout" value={`₹${data.totalPayoutInr.toLocaleString('en-IN')}`} highlight />
      </div>

      <section className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[color:var(--color-ink)]/8 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">By day</div>
        {data.byDay.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-[color:var(--color-ink-soft)]">No delivered orders in the last 14 days.</div>
        ) : (
          <ul className="divide-y divide-[color:var(--color-ink)]/8">
            {data.byDay.map((d) => (
              <li key={d.date} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[13px] font-medium">{formatDay(d.date)}</div>
                  <div className="text-[13px]">
                    <span className="text-[color:var(--color-forest)] font-serif text-[16px]">₹{d.payoutInr.toLocaleString('en-IN')}</span>
                    <span className="ml-2 text-[11px] text-[color:var(--color-ink-soft)]/70">{d.orders} order{d.orders === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-[color:var(--color-ink)]/8 overflow-hidden">
                  <div className="h-full bg-[color:var(--color-forest)]" style={{ width: `${(d.salesInr / maxSales) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[color:var(--color-ink)]/8 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">Recent delivered orders</div>
        {data.recentOrders.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-[color:var(--color-ink-soft)]">Nothing delivered yet.</div>
        ) : (
          <ul className="divide-y divide-[color:var(--color-ink)]/8">
            {data.recentOrders.map((o) => (
              <li key={o.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium truncate">
                    #{o.id.slice(-6)} · {o.items.map((i) => `${i.name}${i.quantity > 1 ? ` × ${i.quantity}` : ''}`).join(', ')}
                  </div>
                  <div className="text-[11px] text-[color:var(--color-ink-soft)]/60">
                    {o.deliveredAt ? new Date(o.deliveredAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—'} IST
                  </div>
                </div>
                <div className="font-serif text-[16px] text-[color:var(--color-forest)]">₹{o.subtotalInr}</div>
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
    <div className={`rounded-2xl p-5 border ${highlight ? 'border-[color:var(--color-forest)]/30 bg-gradient-to-br from-[color:var(--color-forest)]/8 to-[color:var(--color-moss)]/4' : 'border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)]'}`}>
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-ink-soft)]/70">{label}</div>
      <div className="mt-1.5 font-serif text-[28px] leading-none">{value}</div>
      {note && <div className="mt-1.5 text-[11.5px] text-[color:var(--color-ink-soft)]/70">{note}</div>}
    </div>
  );
}

function formatDay(iso: string): string {
  return new Date(iso + 'T00:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' });
}
