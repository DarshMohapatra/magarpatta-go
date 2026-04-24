'use client';

import { useEffect, useMemo, useState } from 'react';

interface Customer {
  id: string;
  phone: string;
  name: string | null;
  createdAt: string;
  orderCount: number;
  lifetimeInr: number;
  lastOrderAt: string | null;
  society: string | null;
  building: string | null;
  flat: string | null;
}

export function AdminCustomersClient() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    fetch('/api/admin/customers', { cache: 'no-store' }).then((r) => r.json()).then((j) => { if (j.ok) setRows(j.customers); });
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) =>
      r.phone.includes(needle) ||
      (r.name ?? '').toLowerCase().includes(needle) ||
      (r.society ?? '').toLowerCase().includes(needle) ||
      (r.building ?? '').toLowerCase().includes(needle),
    );
  }, [q, rows]);

  const lifetime = filtered.reduce((s, r) => s + r.lifetimeInr, 0);
  const active = filtered.filter((r) => r.lastOrderAt).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Customers</div>
          <h1 className="mt-2 font-serif text-[32px] sm:text-[40px] leading-[1.02] tracking-[-0.02em]">
            Magarpatta <span className="italic text-[color:var(--color-forest)]">neighbours.</span>
          </h1>
        </div>
        <input
          placeholder="Search phone / name / society"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rounded-full border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-2 text-[13px] outline-none focus:border-[color:var(--color-forest)] w-full sm:w-[280px]"
        />
      </div>

      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        <Tile label="Total customers" value={String(filtered.length)} />
        <Tile label="Active (ever ordered)" value={String(active)} />
        <Tile label="Lifetime GMV" value={`₹${lifetime.toLocaleString('en-IN')}`} highlight />
      </div>

      <div className="mt-6 rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[color:var(--color-ink)]/8 grid grid-cols-12 text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/65">
          <div className="col-span-3">Customer</div>
          <div className="col-span-3">Address</div>
          <div className="col-span-2 text-right">Orders</div>
          <div className="col-span-2 text-right">Lifetime</div>
          <div className="col-span-2 text-right">Last order</div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-[color:var(--color-ink-soft)]/70">No customers found.</div>
        ) : (
          <ul className="divide-y divide-[color:var(--color-ink)]/8">
            {filtered.map((r) => (
              <li key={r.id} className="px-5 py-3 grid grid-cols-12 items-center gap-3 text-[13px]">
                <div className="col-span-3 min-w-0">
                  <div className="font-medium truncate">{r.name ?? '—'}</div>
                  <div className="text-[11.5px] text-[color:var(--color-ink-soft)]/70">+91 {r.phone}</div>
                </div>
                <div className="col-span-3 text-[12.5px] text-[color:var(--color-ink-soft)]/80 truncate">
                  {r.building ? `${r.building} · flat ${r.flat}` : '—'}
                  {r.society && <span className="block text-[11px] text-[color:var(--color-ink-soft)]/60">{r.society}</span>}
                </div>
                <div className="col-span-2 text-right">{r.orderCount}</div>
                <div className="col-span-2 text-right font-serif text-[color:var(--color-forest)]">₹{r.lifetimeInr.toLocaleString('en-IN')}</div>
                <div className="col-span-2 text-right text-[11.5px] text-[color:var(--color-ink-soft)]/70">
                  {r.lastOrderAt ? new Date(r.lastOrderAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' }) : '—'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 border ${highlight ? 'border-[color:var(--color-forest)]/30 bg-gradient-to-br from-[color:var(--color-forest)]/8 to-[color:var(--color-moss)]/4' : 'border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)]'}`}>
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-ink-soft)]/70">{label}</div>
      <div className="mt-1.5 font-serif text-[28px] leading-none">{value}</div>
    </div>
  );
}
