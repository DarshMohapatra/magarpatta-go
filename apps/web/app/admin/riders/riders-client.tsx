'use client';

import { useEffect, useState } from 'react';

interface Rider {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  aadhaarNumber: string | null;
  dlNumber: string | null;
  vehicleType: string | null;
  vehicleNumber: string | null;
  approvalStatus: string;
  approvalNote: string | null;
  perDropInr: number;
  onDuty: boolean;
  createdAt: string;
  approvedAt: string | null;
}

const TABS: Array<{ key: string; label: string }> = [
  { key: 'PENDING',    label: 'Pending' },
  { key: 'APPROVED',   label: 'Approved' },
  { key: 'SUSPENDED',  label: 'Suspended' },
  { key: 'REJECTED',   label: 'Rejected' },
  { key: 'PERFORMANCE', label: 'Performance' },
];

interface PerformanceRow {
  id: string; phone: string; name: string;
  vehicleType: string | null; vehicleNumber: string | null;
  perDropInr: number; onDuty: boolean;
  drops30: number; dropsToday: number; earnings30Inr: number;
  ratingCount: number; avgRating: number; avgDeliverMin: number;
}

export function AdminRidersClient({ initialStatus }: { initialStatus: string }) {
  const [tab, setTab] = useState<string>(TABS.find((t) => t.key === initialStatus)?.key ?? 'PENDING');
  const [riders, setRiders] = useState<Rider[]>([]);
  const [perf, setPerf] = useState<PerformanceRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ phone: '', name: '', email: '', aadhaarNumber: '', dlNumber: '', vehicleType: 'motorcycle', vehicleNumber: '', perDropInr: 30 });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Record<string, string>>({});

  async function load() {
    if (tab === 'PERFORMANCE') {
      const r = await fetch('/api/admin/riders/performance', { cache: 'no-store' });
      const j = await r.json();
      if (j.ok) setPerf(j.riders);
      return;
    }
    const r = await fetch(`/api/admin/riders?status=${tab}`, { cache: 'no-store' });
    const j = await r.json();
    if (j.ok) {
      setRiders(j.riders);
      const c: Record<string, number> = {};
      for (const row of j.counts) c[row.approvalStatus] = row._count;
      setCounts(c);
    }
  }
  useEffect(() => { load(); }, [tab]); // eslint-disable-line

  async function act(id: string, endpoint: 'approve' | 'reject' | 'suspend', payload?: Record<string, unknown>) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/riders/${id}/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      });
      const j = await r.json();
      if (!j.ok) alert(j.error ?? 'Action failed');
      load();
    } finally { setBusy(false); }
  }

  async function createRider() {
    setBusy(true);
    try {
      const r = await fetch('/api/admin/riders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!j.ok) { alert(j.error ?? 'Failed'); return; }
      setShowAdd(false);
      setForm({ phone: '', name: '', email: '', aadhaarNumber: '', dlNumber: '', vehicleType: 'motorcycle', vehicleNumber: '', perDropInr: 30 });
      setTab('PENDING');
      load();
    } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Riders</div>
          <h1 className="mt-2 font-serif text-[32px] sm:text-[40px] leading-[1.02] tracking-[-0.02em]">
            Neighbours on <span className="italic text-[color:var(--color-forest)]">duty.</span>
          </h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-2.5 text-[13.5px] font-medium hover:bg-[color:var(--color-forest-dark)]">
          + Onboard rider
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] border ${
              tab === t.key
                ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] border-[color:var(--color-forest)]'
                : 'bg-[color:var(--color-paper)] text-[color:var(--color-ink-soft)] border-[color:var(--color-ink)]/12'
            }`}>
            {t.label}
            {t.key !== 'PERFORMANCE' && <span className="ml-1.5 opacity-70">{counts[t.key] ?? 0}</span>}
          </button>
        ))}
      </div>

      {tab === 'PERFORMANCE' && (
        <section className="mt-5 rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[color:var(--color-ink)]/8 grid grid-cols-12 text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/65">
            <div className="col-span-3">Rider</div>
            <div className="col-span-1 text-right">Today</div>
            <div className="col-span-1 text-right">30d drops</div>
            <div className="col-span-2 text-right">30d earnings</div>
            <div className="col-span-2 text-right">Avg pickup→drop</div>
            <div className="col-span-3 text-right">Rating</div>
          </div>
          {perf.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[color:var(--color-ink-soft)]/70">
              No performance data yet — riders need delivered drops first.
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--color-ink)]/8">
              {perf.map((r) => (
                <li key={r.id} className="px-5 py-3 grid grid-cols-12 items-center gap-3 text-[13px]">
                  <div className="col-span-3 min-w-0">
                    <div className="font-medium truncate">{r.name}</div>
                    <div className="text-[11.5px] text-[color:var(--color-ink-soft)]/70">+91 {r.phone} · {r.vehicleType ?? '—'}</div>
                  </div>
                  <div className="col-span-1 text-right tabular-nums">{r.dropsToday}</div>
                  <div className="col-span-1 text-right tabular-nums">{r.drops30}</div>
                  <div className="col-span-2 text-right font-serif text-[color:var(--color-forest)]">₹{r.earnings30Inr.toLocaleString('en-IN')}</div>
                  <div className="col-span-2 text-right">
                    {r.avgDeliverMin ? `${r.avgDeliverMin} min` : <span className="text-[color:var(--color-ink-soft)]/50">—</span>}
                  </div>
                  <div className="col-span-3 text-right">
                    {r.ratingCount === 0 ? (
                      <span className="text-[color:var(--color-ink-soft)]/50">no ratings</span>
                    ) : (
                      <>
                        <span className="text-[color:var(--color-saffron)]">★</span>{' '}
                        <span className="font-serif text-[15px]">{r.avgRating.toFixed(1)}</span>
                        <span className="text-[11px] text-[color:var(--color-ink-soft)]/70"> · {r.ratingCount}</span>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab !== 'PERFORMANCE' && (
      <ul className="mt-5 grid md:grid-cols-2 gap-3">
        {riders.length === 0 && (
          <li className="md:col-span-2 rounded-xl border border-dashed border-[color:var(--color-ink)]/15 p-6 text-center text-[13px] text-[color:var(--color-ink-soft)]/70">
            Nothing here.
          </li>
        )}
        {riders.map((r) => (
          <li key={r.id} className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-serif text-[18px] leading-tight truncate">{r.name}</div>
                <div className="text-[12px] text-[color:var(--color-ink-soft)]/75 truncate">
                  +91 {r.phone} · {r.vehicleType ?? '—'} {r.vehicleNumber ? `(${r.vehicleNumber})` : ''}
                </div>
                <div className="mt-1 text-[11px] text-[color:var(--color-ink-soft)]/60">
                  DL {r.dlNumber ?? '—'} · Aadhaar {r.aadhaarNumber ? `•••• ${r.aadhaarNumber.slice(-4)}` : '—'} · ₹{r.perDropInr}/drop
                </div>
              </div>
              <div className="text-right shrink-0 text-[11px] uppercase tracking-[0.12em]">
                <span className={
                  r.approvalStatus === 'APPROVED' ? 'text-[color:var(--color-forest)]' :
                  r.approvalStatus === 'PENDING' ? 'text-[color:var(--color-saffron)]' :
                  'text-[color:var(--color-terracotta)]'
                }>{r.approvalStatus.toLowerCase()}</span>
              </div>
            </div>
            {r.approvalNote && (
              <div className="mt-2 text-[11.5px] text-[color:var(--color-ink-soft)]/75">Note: {r.approvalNote}</div>
            )}
            {r.approvalStatus !== 'APPROVED' && (
              <input
                placeholder="Note (for reject / suspend)"
                value={note[r.id] ?? ''}
                onChange={(e) => setNote({ ...note, [r.id]: e.target.value })}
                className="mt-3 w-full rounded-lg border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-3 py-1.5 text-[12.5px] outline-none focus:border-[color:var(--color-forest)]"
              />
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {r.approvalStatus !== 'APPROVED' && (
                <button disabled={busy} onClick={() => act(r.id, 'approve')}
                  className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-3.5 py-1.5 text-[12px] font-medium hover:bg-[color:var(--color-forest-dark)]">
                  Approve
                </button>
              )}
              {r.approvalStatus === 'PENDING' && (
                <button disabled={busy} onClick={() => act(r.id, 'reject', { note: note[r.id] })}
                  className="rounded-full border border-[color:var(--color-terracotta)]/40 text-[color:var(--color-terracotta)] px-3.5 py-1.5 text-[12px]">
                  Reject
                </button>
              )}
              {r.approvalStatus === 'APPROVED' && (
                <button disabled={busy} onClick={() => act(r.id, 'suspend', { note: note[r.id] })}
                  className="rounded-full border border-[color:var(--color-terracotta)]/40 text-[color:var(--color-terracotta)] px-3.5 py-1.5 text-[12px]">
                  Suspend
                </button>
              )}
              {r.approvalStatus === 'SUSPENDED' && (
                <button disabled={busy} onClick={() => act(r.id, 'suspend', { unsuspend: true })}
                  className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-3.5 py-1.5 text-[12px]">
                  Lift
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[color:var(--color-ink)]/40 backdrop-blur-sm">
          <div className="w-full max-w-[520px] rounded-t-3xl sm:rounded-3xl bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-[22px]">Onboard a rider</h2>
              <button onClick={() => setShowAdd(false)} className="text-[12px] text-[color:var(--color-ink-soft)]">Close</button>
            </div>
            <Field label="Full name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} /></Field>
            <Field label="Phone (+91)"><input inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className={inp} /></Field>
            <Field label="Email (optional)"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inp} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Aadhaar"><input value={form.aadhaarNumber} onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) })} className={inp} /></Field>
              <Field label="DL number"><input value={form.dlNumber} onChange={(e) => setForm({ ...form, dlNumber: e.target.value.toUpperCase() })} className={inp} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vehicle type">
                <select value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} className={inp}>
                  <option value="bicycle">Bicycle</option>
                  <option value="scooter">Scooter</option>
                  <option value="motorcycle">Motorcycle</option>
                </select>
              </Field>
              <Field label="Vehicle number"><input value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })} className={inp} placeholder="MH12 AB 1234" /></Field>
            </div>
            <Field label="Per-drop payout (₹)"><input type="number" value={form.perDropInr} onChange={(e) => setForm({ ...form, perDropInr: Number(e.target.value) })} className={inp} /></Field>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-[13px] text-[color:var(--color-ink-soft)]">Cancel</button>
              <button disabled={busy || form.phone.length !== 10 || !form.name} onClick={createRider}
                className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-2 text-[13px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50">
                {busy ? 'Creating…' : 'Create (pending review)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = 'mt-1 w-full rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-3 py-2 text-[13.5px] outline-none focus:border-[color:var(--color-forest)]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">{label}</span>
      {children}
    </label>
  );
}
