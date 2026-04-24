'use client';

import { useEffect, useState } from 'react';

interface Order {
  id: string;
  status: string;
  placedAt: string;
  deliveredAt: string | null;
  vendorName: string | null;
  riderName: string | null;
  riderPhone: string | null;
  society: string;
  building: string;
  flat: string;
  totalInr: number;
  items: Array<{ name: string; quantity: number }>;
}

interface Rider { id: string; phone: string; name: string; onDuty: boolean }

export function AdminOrdersClient() {
  const [scope, setScope] = useState<'active' | 'today' | 'all'>('active');
  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [reassignFor, setReassignFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [o, r] = await Promise.all([
      fetch(`/api/admin/orders?scope=${scope}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/admin/riders?status=APPROVED', { cache: 'no-store' }).then((r) => r.json()),
    ]);
    if (o.ok) setOrders(o.orders);
    if (r.ok) setRiders(r.riders);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [scope]); // eslint-disable-line

  async function reassign(id: string, riderPhone: string | null) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/orders/${id}/reassign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderPhone }),
      });
      const j = await r.json();
      if (!j.ok) { alert(j.error ?? 'Failed'); return; }
      setReassignFor(null);
      load();
    } finally { setBusy(false); }
  }

  async function cancel(id: string) {
    const reason = prompt('Cancel reason? (shown to customer)');
    if (!reason) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/orders/${id}/cancel`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      load();
    } finally { setBusy(false); }
  }

  return (
    <div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Orders</div>
        <h1 className="mt-2 font-serif text-[32px] sm:text-[40px] leading-[1.02] tracking-[-0.02em]">
          The whole <span className="italic text-[color:var(--color-forest)]">board.</span>
        </h1>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(['active', 'today', 'all'] as const).map((s) => (
          <button key={s} onClick={() => setScope(s)}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] border ${
              scope === s
                ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] border-[color:var(--color-forest)]'
                : 'bg-[color:var(--color-paper)] text-[color:var(--color-ink-soft)] border-[color:var(--color-ink)]/12'
            }`}>
            {s === 'active' ? 'Active' : s === 'today' ? 'Today' : 'Last 100'}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-[color:var(--color-ink-soft)]/65 self-center">Auto-refresh · 8s</span>
      </div>

      <ul className="mt-5 space-y-3">
        {orders.length === 0 && (
          <li className="rounded-xl border border-dashed border-[color:var(--color-ink)]/15 p-6 text-center text-[13px] text-[color:var(--color-ink-soft)]/70">
            No orders in this view.
          </li>
        )}
        {orders.map((o) => (
          <li key={o.id} className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em]">
                  <span className={o.status === 'DELIVERED' ? 'text-[color:var(--color-forest)]' : o.status === 'CANCELLED' ? 'text-[color:var(--color-terracotta)]' : 'text-[color:var(--color-saffron)]'}>
                    {o.status.replace('_', ' ')}
                  </span>
                  <span className="text-[color:var(--color-ink-soft)]/50">· #{o.id.slice(-6)}</span>
                  <span className="text-[color:var(--color-ink-soft)]/50">· {new Date(o.placedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST</span>
                </div>
                <div className="mt-1 font-medium text-[14.5px] truncate">
                  {o.vendorName ?? '—'} → {o.building} · flat {o.flat} · {o.society}
                </div>
                <div className="text-[12px] text-[color:var(--color-ink-soft)]/80 truncate">
                  {o.items.map((i) => `${i.name}${i.quantity > 1 ? ` × ${i.quantity}` : ''}`).join(', ')}
                </div>
                <div className="mt-1 text-[11.5px] text-[color:var(--color-ink-soft)]/65">
                  Rider · {o.riderName ?? 'unassigned'}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-serif text-[18px] text-[color:var(--color-forest)]">₹{o.totalInr}</div>
              </div>
            </div>

            {reassignFor === o.id ? (
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <select id={`sel-${o.id}`} defaultValue={o.riderPhone ?? ''} className="rounded-lg border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-3 py-1.5 text-[12.5px]">
                  <option value="">— Unassign —</option>
                  {riders.map((r) => <option key={r.phone} value={r.phone}>{r.name} · +91 {r.phone}</option>)}
                </select>
                <button
                  disabled={busy}
                  onClick={() => {
                    const sel = document.getElementById(`sel-${o.id}`) as HTMLSelectElement;
                    reassign(o.id, sel.value || null);
                  }}
                  className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-3.5 py-1.5 text-[12px] font-medium">
                  Save
                </button>
                <button onClick={() => setReassignFor(null)} className="text-[12px] text-[color:var(--color-ink-soft)]">Cancel</button>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {!['DELIVERED', 'CANCELLED'].includes(o.status) && (
                  <>
                    <button onClick={() => setReassignFor(o.id)} className="rounded-full border border-[color:var(--color-forest)]/35 text-[color:var(--color-forest)] px-3.5 py-1.5 text-[12px] hover:bg-[color:var(--color-forest)]/8">
                      {o.riderName ? 'Reassign rider' : 'Assign rider'}
                    </button>
                    <button onClick={() => cancel(o.id)} className="rounded-full border border-[color:var(--color-terracotta)]/40 text-[color:var(--color-terracotta)] px-3.5 py-1.5 text-[12px] hover:bg-[color:var(--color-terracotta)]/8">
                      Cancel + refund
                    </button>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
