'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { RiderSession } from '@/lib/rider-session';
import { siteConfig } from '@/lib/site-config';
import { LocationTracker } from '@/components/rider/location-tracker';

interface OrderData {
  id: string;
  status: string;
  placedAt: string;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  totalInr: number;
  paymentMethod: string;
  society: string;
  building: string;
  flat: string;
  vendorName: string | null;
  vendorHub: string | null;
  notes: string | null;
  riderPhone: string | null;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string | null;
    mrpInr: number | null;
    priceInr: number;
  }>;
}

interface Props {
  rider: RiderSession;
  expectedOtp: string;
  order: OrderData;
}

export function RiderOrderClient({ rider, expectedOtp, order }: Props) {
  const router = useRouter();
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isMine = order.riderPhone === rider.phone;
  const delivered = order.status === 'DELIVERED';
  const picked = order.status === 'PICKED_UP' || order.status === 'OUT_FOR_DELIVERY';

  async function act(path: string, body?: unknown) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/rider/orders/${order.id}/${path}`, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error ?? 'Action failed');
        setBusy(false);
        return false;
      }
      router.refresh();
      setBusy(false);
      return true;
    } catch {
      setErr('Network error.');
      setBusy(false);
      return false;
    }
  }

  return (
    <main className="font-display min-h-screen bg-[color:var(--color-background)]">
      <LocationTracker orderId={order.id} />
      <header className="sticky top-0 z-40 border-b border-[color:var(--color-foreground)]/8 bg-[color:var(--color-background)]/85 backdrop-blur-md">
        <div className="mx-auto max-w-[720px] px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link href="/rider" className="inline-flex items-center gap-1.5 text-[12px] text-[color:var(--color-muted)] hover:text-[color:var(--color-primary)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Dashboard
          </Link>
          <div className="text-[10.5px] uppercase tracking-[0.16em] font-semibold text-[color:var(--color-saffron)]">
            #{order.id.slice(-6).toUpperCase()} · {order.status.replace('_', ' ')}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[720px] px-4 sm:px-6 pt-4 space-y-4">
        {/* Gradient-warm summary hero */}
        <div className="relative overflow-hidden rounded-[var(--radius-2xl)] gradient-warm text-white p-5 shadow-[var(--shadow-glow)]">
          <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <div className="relative">
            <div className="text-[10px] uppercase tracking-[0.18em] font-semibold opacity-90">Active delivery</div>
            <h1 className="mt-2 font-display text-[24px] leading-tight tracking-tight">
              {order.vendorName ?? 'Vendor'} → {order.building}, flat {order.flat}
            </h1>
            <p className="mt-1 text-[12.5px] opacity-90">
              {order.items.length} item{order.items.length === 1 ? '' : 's'} · ₹{order.totalInr} · {prettyPay(order.paymentMethod)}
            </p>
          </div>
        </div>
        {/* Pickup card */}
        <div className="rounded-2xl bg-[color:var(--color-surface)] border border-[color:var(--color-foreground)]/10 p-5">
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-terracotta)]">Pickup from</div>
          <div className="mt-1 font-display text-[24px] leading-tight">{order.vendorName ?? 'Vendor'}</div>
          {order.vendorHub && (
            <div className="text-[13px] text-[color:var(--color-muted)]">{order.vendorHub}</div>
          )}
        </div>

        {/* Drop card */}
        <div className="rounded-2xl bg-[color:var(--color-surface)] border border-[color:var(--color-foreground)]/10 p-5">
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-primary)]">Drop at</div>
          <div className="mt-1 font-display text-[24px] leading-tight">Flat {order.flat}, {order.building}</div>
          <div className="text-[13px] text-[color:var(--color-muted)]">{order.society} · {siteConfig.siteName}</div>
          {order.notes && (
            <div className="mt-3 rounded-lg bg-[color:var(--color-background)] p-3">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-muted)]/70">Customer note</div>
              <div className="mt-1 text-[13.5px]">{order.notes}</div>
            </div>
          )}
        </div>

        {/* Items summary */}
        <div className="rounded-2xl bg-[color:var(--color-surface)] border border-[color:var(--color-foreground)]/10 p-5">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">
            {order.items.length} item{order.items.length === 1 ? '' : 's'}
          </div>
          <ul className="mt-2 space-y-1.5 text-[13.5px]">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate">{i.name}{i.unit ? ` · ${i.unit}` : ''}</span>
                <span className="shrink-0 text-[color:var(--color-muted)]">× {i.quantity}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-[color:var(--color-foreground)]/8 flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--color-muted)]">Order value</span>
            <span className="font-display text-[18px]">₹{order.totalInr}</span>
          </div>
          <div className="mt-1 text-[11.5px] text-[color:var(--color-muted)]/75">
            Payment: {prettyPay(order.paymentMethod)}
          </div>
        </div>

        {err && (
          <div className="rounded-xl bg-[color:var(--color-terracotta)]/10 border border-[color:var(--color-terracotta)]/25 px-4 py-3 text-[13px] text-[color:var(--color-terracotta-dark)]">
            {err}
          </div>
        )}

        {/* Actions */}
        {!isMine && order.status === 'PLACED' && (
          <button
            disabled={busy}
            onClick={() => act('accept')}
            className="w-full rounded-xl bg-[color:var(--color-primary)] text-[color:var(--color-background)] py-4 text-[15px] font-medium hover:bg-[color:var(--color-primary)] disabled:opacity-60"
          >
            {busy ? 'Claiming…' : 'Accept this order'}
          </button>
        )}

        {isMine && !picked && !delivered && (
          <button
            disabled={busy}
            onClick={() => act('pickup')}
            className="w-full rounded-xl bg-[color:var(--color-saffron)] text-[color:var(--color-foreground)] py-4 text-[15px] font-medium hover:brightness-95 disabled:opacity-60"
          >
            {busy ? 'Updating…' : "I've picked up the order"}
          </button>
        )}

        {isMine && picked && !delivered && (
          <div className="rounded-2xl bg-[color:var(--color-surface)] border border-[color:var(--color-foreground)]/10 p-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">Delivery OTP</div>
            <div className="mt-1 font-display text-[20px] leading-tight">
              Ask the customer for their 4-digit code.
            </div>
            <p className="mt-2 text-[12.5px] text-[color:var(--color-muted)]">
              They&apos;ll see it on their order page. No code = no handover.
            </p>
            <input
              inputMode="numeric"
              maxLength={4}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="• • • •"
              className="mt-4 w-full rounded-xl border border-[color:var(--color-foreground)]/15 bg-[color:var(--color-background)] px-4 py-4 text-center font-mono text-[28px] tracking-[0.5em] outline-none focus:border-[color:var(--color-primary)]"
            />
            <button
              disabled={otp.length !== 4 || busy}
              onClick={async () => {
                const ok = await act('deliver', { otp });
                if (ok) setOtp('');
              }}
              className="mt-3 w-full rounded-xl bg-[color:var(--color-primary)] text-[color:var(--color-background)] py-4 text-[15px] font-medium hover:bg-[color:var(--color-primary)] disabled:opacity-60"
            >
              {busy ? 'Checking OTP…' : 'Mark delivered'}
            </button>

            {process.env.NODE_ENV !== 'production' && (
              <details className="mt-3 text-[11px] text-[color:var(--color-muted)]/70">
                <summary className="cursor-pointer">Dev hint</summary>
                <div className="mt-1 font-mono">Expected: {expectedOtp}</div>
              </details>
            )}
          </div>
        )}

        {delivered && (
          <div className="rounded-2xl bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/30 p-5 text-center">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-primary)]">Delivered</div>
            <div className="mt-1 font-display text-[24px]">
              {order.deliveredAt
                ? new Date(order.deliveredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                : '—'} IST
            </div>
            <p className="mt-2 text-[12.5px] text-[color:var(--color-muted)]">
              Nice drop. +₹{rider.perDropInr} added to today&apos;s earnings.
            </p>
            <Link href="/rider"
              className="mt-4 inline-block rounded-full bg-[color:var(--color-primary)] text-[color:var(--color-background)] px-5 py-2.5 text-[13px] font-medium hover:bg-[color:var(--color-primary)]">
              Next order →
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function prettyPay(m: string): string {
  switch (m) {
    case 'COD': return 'Cash on delivery — collect from customer';
    case 'UPI': return 'UPI (paid online)';
    case 'CARD': return 'Card (paid online)';
    case 'NET_BANKING': return 'Net banking (paid online)';
    default: return m;
  }
}
