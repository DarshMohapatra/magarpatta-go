'use client';

import { useEffect, useMemo, useState } from 'react';
import { siteConfig } from '@/lib/site-config';
import { PartnerPageHero } from '@/components/partner/partner-page-hero';

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
  prepaidDelivered: number;
  codApprovedByAdmin: boolean;
}

const PREPAID_THRESHOLD = 3;

export function AdminCustomersClient() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/customers', { cache: 'no-store' }).then((r) => r.json()).then((j) => { if (j.ok) setRows(j.customers); });
  }, []);

  async function toggleCod(c: Customer) {
    const next = !c.codApprovedByAdmin;
    if (!next && !confirm(`Revoke COD approval for ${c.name ?? '+91 ' + c.phone}?`)) return;
    setBusyId(c.id);
    try {
      const r = await fetch(`/api/admin/customers/${c.id}/cod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve: next }),
      });
      const j = await r.json();
      if (j.ok) {
        setRows((prev) => prev.map((x) => (x.id === c.id ? { ...x, codApprovedByAdmin: next } : x)));
      }
    } finally {
      setBusyId(null);
    }
  }

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
      <PartnerPageHero
        eyebrow="Customers"
        title={`${siteConfig.wordmarkRoot} neighbours.`}
        summary={`${filtered.length} on roster · ${active} active · ₹${lifetime.toLocaleString('en-IN')} lifetime`}
        actions={
          <input
            placeholder="Search phone / name / society"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder:text-white/70 px-3.5 py-1.5 text-[12px] outline-none w-[220px]"
          />
        }
      />

      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        <Tile label="Total customers" value={String(filtered.length)} />
        <Tile label="Active (ever ordered)" value={String(active)} />
        <Tile label="Lifetime GMV" value={`₹${lifetime.toLocaleString('en-IN')}`} highlight />
      </div>

      <div className="mt-6 rounded-2xl border border-[color:var(--color-foreground)]/10 bg-[color:var(--color-surface)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[color:var(--color-foreground)]/8 grid grid-cols-12 text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-muted)]/65">
          <div className="col-span-3">Customer</div>
          <div className="col-span-3">Address</div>
          <div className="col-span-1 text-right">Orders</div>
          <div className="col-span-2 text-right">Lifetime</div>
          <div className="col-span-3 text-right">COD status</div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-[color:var(--color-muted)]/70">No customers found.</div>
        ) : (
          <ul className="divide-y divide-[color:var(--color-foreground)]/8">
            {filtered.map((r) => {
              const earned = r.prepaidDelivered >= PREPAID_THRESHOLD;
              const codOn = r.codApprovedByAdmin || earned;
              return (
                <li key={r.id} className="px-5 py-3 grid grid-cols-12 items-center gap-3 text-[13px]">
                  <div className="col-span-3 min-w-0">
                    <div className="font-medium truncate">{r.name ?? '—'}</div>
                    <div className="text-[11.5px] text-[color:var(--color-muted)]/70">+91 {r.phone}</div>
                    {r.lastOrderAt && (
                      <div className="text-[10.5px] text-[color:var(--color-muted)]/55 mt-0.5">
                        last {new Date(r.lastOrderAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' })}
                      </div>
                    )}
                  </div>
                  <div className="col-span-3 text-[12.5px] text-[color:var(--color-muted)]/80 truncate">
                    {r.building ? `${r.building} · flat ${r.flat}` : '—'}
                    {r.society && <span className="block text-[11px] text-[color:var(--color-muted)]/60">{r.society}</span>}
                  </div>
                  <div className="col-span-1 text-right">{r.orderCount}</div>
                  <div className="col-span-2 text-right font-display text-[color:var(--color-primary)]">₹{r.lifetimeInr.toLocaleString('en-IN')}</div>
                  <div className="col-span-3 text-right">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] uppercase tracking-[0.14em] ${
                          codOn
                            ? 'bg-[color:var(--color-primary)]/12 text-[color:var(--color-primary)]'
                            : 'bg-[color:var(--color-foreground)]/8 text-[color:var(--color-muted)]'
                        }`}
                      >
                        {codOn ? (r.codApprovedByAdmin ? 'COD · admin' : 'COD · earned') : `${r.prepaidDelivered}/${PREPAID_THRESHOLD} prepaid`}
                      </span>
                      <button
                        disabled={busyId === r.id}
                        onClick={() => toggleCod(r)}
                        className={`text-[11.5px] underline underline-offset-2 disabled:opacity-50 ${
                          r.codApprovedByAdmin
                            ? 'text-[color:var(--color-terracotta)]'
                            : 'text-[color:var(--color-primary)]'
                        }`}
                      >
                        {r.codApprovedByAdmin ? 'Revoke' : 'Approve'}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 border ${highlight ? 'border-[color:var(--color-primary)]/30 bg-gradient-to-br from-[color:var(--color-primary)]/8 to-[color:var(--color-moss)]/4' : 'border-[color:var(--color-foreground)]/10 bg-[color:var(--color-surface)]'}`}>
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-muted)]/70">{label}</div>
      <div className="mt-1.5 font-display text-[28px] leading-none">{value}</div>
    </div>
  );
}
