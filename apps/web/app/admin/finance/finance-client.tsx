'use client';

import { useEffect, useState } from 'react';

interface Data {
  gmvInr: number;
  grossMerchandiseInr: number;
  deliveryCollectedInr: number;
  discountGivenInr: number;
  platformCommissionInr: number;
  orderCount: number;
  byDay: Array<{ date: string; gmv: number; orders: number }>;
  vendorRows: Array<{ vendorId: string; vendorName: string; salesInr: number; commissionInr: number }>;
}

export function AdminFinanceClient() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch('/api/admin/finance', { cache: 'no-store' }).then((r) => r.json()).then((j) => { if (j.ok) setData(j); });
  }, []);

  if (!data) return <div className="text-[13px] text-[color:var(--color-ink-soft)]">Loading…</div>;

  const maxGmv = Math.max(1, ...data.byDay.map((d) => d.gmv));

  return (
    <div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Finance · last 14 days</div>
        <h1 className="mt-2 font-serif text-[32px] sm:text-[40px] leading-[1.02] tracking-[-0.02em]">
          Platform <span className="italic text-[color:var(--color-forest)]">economics.</span>
        </h1>
      </div>

      <div className="mt-6 grid md:grid-cols-4 gap-4">
        <Stat label="GMV" value={`₹${data.gmvInr.toLocaleString('en-IN')}`} note={`${data.orderCount} delivered`} highlight />
        <Stat label="Gross merchandise" value={`₹${data.grossMerchandiseInr.toLocaleString('en-IN')}`} note="paid to vendors before commission" />
        <Stat label="Delivery collected" value={`₹${data.deliveryCollectedInr.toLocaleString('en-IN')}`} note="customer-side fee" />
        <Stat label="Platform commission" value={`₹${data.platformCommissionInr.toLocaleString('en-IN')}`} note="vendor take-rate" />
      </div>

      <section className="mt-8 rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[color:var(--color-ink)]/8 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">By day</div>
        {data.byDay.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-[color:var(--color-ink-soft)]">No deliveries in the last 14 days.</div>
        ) : (
          <ul className="divide-y divide-[color:var(--color-ink)]/8">
            {data.byDay.map((d) => (
              <li key={d.date} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[13px] font-medium">{formatDay(d.date)}</div>
                  <div className="text-[13px]">
                    <span className="text-[color:var(--color-forest)] font-serif text-[16px]">₹{d.gmv.toLocaleString('en-IN')}</span>
                    <span className="ml-2 text-[11px] text-[color:var(--color-ink-soft)]/70">{d.orders} order{d.orders === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-[color:var(--color-ink)]/8 overflow-hidden">
                  <div className="h-full bg-[color:var(--color-forest)]" style={{ width: `${(d.gmv / maxGmv) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[color:var(--color-ink)]/8 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">By vendor</div>
        {data.vendorRows.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-[color:var(--color-ink-soft)]">No vendor sales in the last 14 days.</div>
        ) : (
          <ul className="divide-y divide-[color:var(--color-ink)]/8">
            {data.vendorRows.map((r) => (
              <li key={r.vendorId} className="px-5 py-3 flex items-center justify-between gap-3 text-[13px]">
                <div className="font-medium truncate">{r.vendorName}</div>
                <div className="text-right text-[12.5px]">
                  <div><span className="text-[color:var(--color-ink-soft)]/70">Sales</span> <span className="font-serif text-[color:var(--color-forest)]">₹{r.salesInr.toLocaleString('en-IN')}</span></div>
                  <div className="text-[11.5px] text-[color:var(--color-ink-soft)]/70">Commission ₹{r.commissionInr.toLocaleString('en-IN')}</div>
                </div>
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
      <div className="mt-1.5 font-serif text-[26px] leading-none">{value}</div>
      {note && <div className="mt-1.5 text-[11.5px] text-[color:var(--color-ink-soft)]/70">{note}</div>}
    </div>
  );
}

function formatDay(iso: string): string {
  return new Date(iso + 'T00:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' });
}
