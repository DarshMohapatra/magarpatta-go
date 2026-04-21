'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { RiderSession } from '@/lib/rider-session';

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
    <main className="min-h-screen">
      <header className="border-b border-[color:var(--color-ink)]/8 bg-[color:var(--color-paper)]">
        <div className="mx-auto max-w-[720px] px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/rider" className="text-[13px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)]">
            ← Dashboard
          </Link>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">
            #{order.id.slice(-6)} · {order.status.replace('_', ' ')}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[720px] px-4 sm:px-6 py-6 space-y-5">
        {/* Pickup card */}
        <div className="rounded-2xl bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 p-5">
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-terracotta)]">Pickup from</div>
          <div className="mt-1 font-serif text-[24px] leading-tight">{order.vendorName ?? 'Vendor'}</div>
          {order.vendorHub && (
            <div className="text-[13px] text-[color:var(--color-ink-soft)]">{order.vendorHub}</div>
          )}
        </div>

        {/* Drop card */}
        <div className="rounded-2xl bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 p-5">
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-forest)]">Drop at</div>
          <div className="mt-1 font-serif text-[24px] leading-tight">Flat {order.flat}, {order.building}</div>
          <div className="text-[13px] text-[color:var(--color-ink-soft)]">{order.society} · Magarpatta City</div>
          {order.notes && (
            <div className="mt-3 rounded-lg bg-[color:var(--color-cream)] p-3">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/70">Customer note</div>
              <div className="mt-1 text-[13.5px]">{order.notes}</div>
            </div>
          )}
        </div>

        {/* Items summary */}
        <div className="rounded-2xl bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 p-5">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">
            {order.items.length} item{order.items.length === 1 ? '' : 's'}
          </div>
          <ul className="mt-2 space-y-1.5 text-[13.5px]">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate">{i.name}{i.unit ? ` · ${i.unit}` : ''}</span>
                <span className="shrink-0 text-[color:var(--color-ink-soft)]">× {i.quantity}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-[color:var(--color-ink)]/8 flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]">Order value</span>
            <span className="font-serif text-[18px]">₹{order.totalInr}</span>
          </div>
          <div className="mt-1 text-[11.5px] text-[color:var(--color-ink-soft)]/75">
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
            className="w-full rounded-xl bg-[color:var(--color-forest)] text-[color:var(--color-cream)] py-4 text-[15px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-60"
          >
            {busy ? 'Claiming…' : 'Accept this order'}
          </button>
        )}

        {isMine && !picked && !delivered && (
          <button
            disabled={busy}
            onClick={() => act('pickup')}
            className="w-full rounded-xl bg-[color:var(--color-saffron)] text-[color:var(--color-ink)] py-4 text-[15px] font-medium hover:brightness-95 disabled:opacity-60"
          >
            {busy ? 'Updating…' : "I've picked up the order"}
          </button>
        )}

        {isMine && picked && !delivered && (
          <div className="rounded-2xl bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 p-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">Delivery OTP</div>
            <div className="mt-1 font-serif text-[20px] leading-tight">
              Ask the customer for their 4-digit code.
            </div>
            <p className="mt-2 text-[12.5px] text-[color:var(--color-ink-soft)]">
              They&apos;ll see it on their order page. No code = no handover.
            </p>
            <input
              inputMode="numeric"
              maxLength={4}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="• • • •"
              className="mt-4 w-full rounded-xl border border-[color:var(--color-ink)]/15 bg-[color:var(--color-cream)] px-4 py-4 text-center font-mono text-[28px] tracking-[0.5em] outline-none focus:border-[color:var(--color-forest)]"
            />
            <button
              disabled={otp.length !== 4 || busy}
              onClick={async () => {
                const ok = await act('deliver', { otp });
                if (ok) setOtp('');
              }}
              className="mt-3 w-full rounded-xl bg-[color:var(--color-forest)] text-[color:var(--color-cream)] py-4 text-[15px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-60"
            >
              {busy ? 'Checking OTP…' : 'Mark delivered'}
            </button>

            {process.env.NODE_ENV !== 'production' && (
              <details className="mt-3 text-[11px] text-[color:var(--color-ink-soft)]/70">
                <summary className="cursor-pointer">Dev hint</summary>
                <div className="mt-1 font-mono">Expected: {expectedOtp}</div>
              </details>
            )}
          </div>
        )}

        {delivered && (
          <div className="rounded-2xl bg-[color:var(--color-forest)]/10 border border-[color:var(--color-forest)]/30 p-5 text-center">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-forest)]">Delivered</div>
            <div className="mt-1 font-serif text-[24px]">
              {order.deliveredAt
                ? new Date(order.deliveredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                : '—'} IST
            </div>
            <p className="mt-2 text-[12.5px] text-[color:var(--color-ink-soft)]">
              Nice drop. +₹{rider.perDropInr} added to today&apos;s earnings.
            </p>
            <Link href="/rider"
              className="mt-4 inline-block rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-2.5 text-[13px] font-medium hover:bg-[color:var(--color-forest-dark)]">
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
