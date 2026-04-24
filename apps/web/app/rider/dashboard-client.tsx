'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { RiderSession } from '@/lib/rider-session';

interface OrderPreview {
  id: string;
  status: string;
  placedAt: string;
  totalInr: number;
  society: string;
  building: string;
  flat: string;
  vendorName: string | null;
  vendorHub: string | null;
  items: Array<{ name: string; quantity: number }>;
  acceptedAt?: string | null;
}

interface HistoryRow {
  id: string;
  totalInr: number;
  deliveredAt: string | null;
  vendorName: string | null;
  society: string;
  building: string;
}

interface Data {
  available: OrderPreview[];
  concierge: OrderPreview[];
  active: OrderPreview[];
  history: HistoryRow[];
  todayDrops: number;
  todayEarningsInr: number;
}

export function RiderDashboardClient({ rider }: { rider: RiderSession }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [signingOut, setSigningOut] = useState(false);

  async function load() {
    try {
      const res = await fetch('/api/rider/orders', { cache: 'no-store' });
      const body = await res.json();
      if (!body.ok) {
        setErr(body.error ?? 'Could not load orders');
        return;
      }
      setData({
        available: body.available,
        concierge: body.concierge ?? [],
        active: body.active,
        history: body.history,
        todayDrops: body.todayDrops,
        todayEarningsInr: body.todayEarningsInr,
      });
      setErr(null);
    } catch {
      setErr('Network error.');
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  async function accept(orderId: string) {
    const res = await fetch(`/api/rider/orders/${orderId}/accept`, { method: 'POST' });
    const body = await res.json();
    if (!body.ok) {
      alert(body.error ?? 'Could not accept order');
      return;
    }
    router.push(`/rider/orders/${orderId}`);
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch('/api/rider/session', { method: 'DELETE' });
    } catch { /* ignore */ }
    startTransition(() => {
      router.push('/rider/signin');
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen">
      {/* Header strip */}
      <header className="border-b border-[color:var(--color-ink)]/8 bg-[color:var(--color-paper)]">
        <div className="mx-auto max-w-[1080px] px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-saffron)] pulse-ring" />
            <span className="text-[14px] tracking-tight font-medium">
              Magarpatta <span className="font-serif italic text-[color:var(--color-forest)]">Go</span>
              <span className="ml-1.5 text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-terracotta)]">Rider</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/rider/feedback" className="text-[12px] text-[color:var(--color-forest)] hover:underline">
              Feedback
            </Link>
            <div className="text-right leading-tight hidden sm:block">
              <div className="text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-saffron)]">On shift</div>
              <div className="text-[13px] font-medium">{rider.name}</div>
            </div>
            <button onClick={signOut} disabled={signingOut}
              className="text-[12px] text-[color:var(--color-terracotta)] hover:underline">
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1080px] px-4 sm:px-6 py-6 space-y-8">
        {/* Earnings strip */}
        <div className="rounded-2xl bg-gradient-to-br from-[color:var(--color-forest)] to-[color:var(--color-moss)] text-[color:var(--color-cream)] p-5 sm:p-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] opacity-80">Today</div>
            <div className="mt-1 font-serif text-[32px] leading-none">₹{data?.todayEarningsInr ?? 0}</div>
            <div className="mt-1 text-[12.5px] opacity-85">
              {data?.todayDrops ?? 0} drop{(data?.todayDrops ?? 0) === 1 ? '' : 's'} · ₹{rider.perDropInr} per delivery
            </div>
          </div>
          <div className="text-right text-[11px] uppercase tracking-[0.14em] opacity-80">
            Auto-refresh · 5s
          </div>
        </div>

        {err && (
          <div className="rounded-xl bg-[color:var(--color-terracotta)]/10 border border-[color:var(--color-terracotta)]/25 px-4 py-3 text-[13px] text-[color:var(--color-terracotta-dark)]">
            {err}
          </div>
        )}

        {/* Active deliveries */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-[22px]">Your active deliveries</h2>
            <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/70">
              {data?.active.length ?? 0}
            </span>
          </div>
          {(data?.active.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-dashed border-[color:var(--color-ink)]/15 p-6 text-center text-[13px] text-[color:var(--color-ink-soft)]">
              Nothing in progress. Grab an order below.
            </div>
          ) : (
            <ul className="space-y-3">
              {data!.active.map((o) => (
                <li key={o.id}>
                  <Link href={`/rider/orders/${o.id}`}
                    className="block rounded-2xl border border-[color:var(--color-forest)]/20 bg-[color:var(--color-forest)]/5 p-4 hover:border-[color:var(--color-forest)]/50 transition-colors">
                    <OrderRow o={o} accent="active" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Available orders — vendor has marked READY */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-[22px]">Ready to pick up</h2>
            <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/70">
              {data?.available.length ?? 0} waiting
            </span>
          </div>
          {(data?.available.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-dashed border-[color:var(--color-ink)]/15 p-6 text-center text-[13px] text-[color:var(--color-ink-soft)]">
              Nothing ready yet. Orders appear here the moment a vendor marks them ready.
            </div>
          ) : (
            <ul className="space-y-3">
              {data!.available.map((o) => (
                <li key={o.id} className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-4">
                  <OrderRow o={o} accent="available" />
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => accept(o.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-4 py-2 text-[13px] font-medium hover:bg-[color:var(--color-forest-dark)]"
                    >
                      Accept order
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Concierge — walk in and buy for the neighbour */}
        {(data?.concierge.length ?? 0) > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-[22px]">Concierge · walk in + buy</h2>
              <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-terracotta)]">
                {data?.concierge.length ?? 0} waiting
              </span>
            </div>
            <p className="text-[12px] text-[color:var(--color-ink-soft)]/75 mb-2 -mt-1">
              The shop isn&apos;t on Magarpatta Go. Walk in, place the order at the counter, pay from your float,
              bring it back, drop it at the customer&apos;s door. Magarpatta Go reimburses you with the order receipt.
            </p>
            <ul className="space-y-3">
              {data!.concierge.map((o) => (
                <li key={o.id} className="rounded-2xl border border-[color:var(--color-terracotta)]/30 bg-[color:var(--color-terracotta)]/5 p-4">
                  <OrderRow o={o} accent="concierge" />
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => accept(o.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-terracotta)] text-[color:var(--color-cream)] px-4 py-2 text-[13px] font-medium hover:brightness-95"
                    >
                      Pick this up →
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recent history */}
        {(data?.history.length ?? 0) > 0 && (
          <div>
            <h2 className="font-serif text-[22px] mb-3">Recent drops</h2>
            <ul className="divide-y divide-[color:var(--color-ink)]/8 rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)]">
              {data!.history.slice(0, 8).map((h) => (
                <li key={h.id} className="px-4 py-3 flex items-center justify-between gap-3 text-[13px]">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{h.vendorName ?? 'Order'} → {h.building}</div>
                    <div className="text-[11.5px] text-[color:var(--color-ink-soft)]/75">
                      {h.deliveredAt
                        ? new Date(h.deliveredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : '—'} IST
                    </div>
                  </div>
                  <div className="font-serif text-[14px] text-[color:var(--color-forest)]">₹{rider.perDropInr}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}

function OrderRow({ o, accent }: { o: OrderPreview; accent: 'active' | 'available' | 'concierge' }) {
  const placed = new Date(o.placedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
  const statusColor =
    accent === 'active' ? 'text-[color:var(--color-forest)]' :
    accent === 'concierge' ? 'text-[color:var(--color-terracotta)]' :
    'text-[color:var(--color-saffron)]';
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em]">
          <span className={statusColor}>
            {accent === 'concierge' ? 'Walk-in · concierge' : o.status.replace('_', ' ')}
          </span>
          <span className="text-[color:var(--color-ink-soft)]/50">· #{o.id.slice(-6)}</span>
        </div>
        <div className="mt-1 font-medium text-[14.5px] truncate">
          {o.vendorName ?? 'Shop'} → {o.building}, flat {o.flat}
        </div>
        <div className="text-[12px] text-[color:var(--color-ink-soft)]/80 truncate">
          {o.items.map((i) => `${i.name}${i.quantity > 1 ? ` × ${i.quantity}` : ''}`).join(', ')}
        </div>
        <div className="mt-1 text-[11px] text-[color:var(--color-ink-soft)]/60">
          {o.society} · placed {placed} IST
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-serif text-[18px]">₹{o.totalInr}</div>
        <div className="text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/65">
          order value
        </div>
      </div>
    </div>
  );
}
