'use client';

import Link from 'next/link';
import type { OrderStatus, PaymentMethod } from '@prisma/client';
import { OrderTracker, useLiveOrder } from './order-tracker';
import { ProductGlyph } from '@/components/product-glyph';
import { expectedStatusForElapsed } from '@/lib/orders';

interface OrderItem {
  id: string;
  name: string;
  vendorName: string;
  unit: string | null;
  priceInr: number;
  quantity: number;
  accent: string | null;
  glyph: string | null;
  imageUrl: string | null;
}

interface OrderData {
  id: string;
  status: OrderStatus;
  placedAt: string;
  subtotalInr: number;
  deliveryFeeInr: number;
  totalInr: number;
  society: string;
  building: string;
  flat: string;
  vendorName: string | null;
  vendorHub: string | null;
  paymentMethod: PaymentMethod;
  notes: string | null;
  items: OrderItem[];
}

export function OrderDetailClient({ order }: { order: OrderData }) {
  const initialElapsed = Math.floor((Date.now() - new Date(order.placedAt).getTime()) / 1000);
  const initialStatus = expectedStatusForElapsed(initialElapsed);

  const live = useLiveOrder(order.id, {
    status: initialStatus,
    elapsedSeconds: initialElapsed,
  });

  const placedDate = new Date(order.placedAt);

  return (
    <section className="pt-24 pb-20">
      <div className="mx-auto max-w-[1080px] px-6 lg:px-10">
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-[12.5px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)] mb-6">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M10 6H2m0 0l3.5 3.5M2 6l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All orders
        </Link>

        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">
              Order #{order.id.slice(-6)}
            </div>
            <h1 className="mt-3 font-serif text-[36px] lg:text-[48px] leading-[1.02] tracking-[-0.02em]">
              {live.status === 'DELIVERED' ? (
                <>Delivered. <span className="italic text-[color:var(--color-forest)]">Enjoy.</span></>
              ) : (
                <>Your order is <span className="italic text-[color:var(--color-forest)]">on the way.</span></>
              )}
            </h1>
            <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)]">
              Placed {placedDate.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Animated tracker */}
        <OrderTracker
          status={live.status}
          elapsedSeconds={live.elapsedSeconds}
          vendorName={order.vendorName}
          society={order.society}
          building={order.building}
          flat={order.flat}
        />

        <div className="mt-8 grid lg:grid-cols-[1.4fr_1fr] gap-8">
          {/* Left — items */}
          <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[color:var(--color-ink)]/8 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">
              {order.items.length} item{order.items.length === 1 ? '' : 's'}
            </div>
            <ul className="divide-y divide-[color:var(--color-ink)]/8">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center gap-4 px-6 py-4">
                  <div
                    className="h-14 w-14 shrink-0 rounded-xl flex items-center justify-center overflow-hidden relative"
                    style={{ backgroundColor: `color-mix(in srgb, var(--color-${it.accent ?? 'forest'}) 12%, transparent)` }}
                  >
                    {it.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.imageUrl} alt={it.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="scale-[0.45]"><ProductGlyph glyph={it.glyph} accent={it.accent} /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-serif text-[17px] leading-tight truncate">{it.name}</div>
                    <div className="text-[12px] text-[color:var(--color-ink-soft)]/75 truncate">
                      {it.vendorName}
                      {it.unit && <span> · {it.unit}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-serif text-[17px]">₹{it.priceInr * it.quantity}</div>
                    <div className="text-[11px] text-[color:var(--color-ink-soft)]/70">× {it.quantity}</div>
                  </div>
                </li>
              ))}
            </ul>

            {order.notes && (
              <div className="px-6 py-4 border-t border-[color:var(--color-ink)]/8 bg-[color:var(--color-cream)]/60">
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/70 mb-1">
                  Delivery note
                </div>
                <p className="text-[13.5px] text-[color:var(--color-ink)]">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Right — address + totals */}
          <aside className="space-y-5">
            <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-5">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">Delivering to</div>
              <div className="mt-2 font-serif text-[20px] leading-tight">
                Flat {order.flat}, {order.building}
              </div>
              <div className="mt-1 text-[12.5px] text-[color:var(--color-ink-soft)]/80">{order.society}</div>
            </div>

            <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-5 space-y-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[color:var(--color-ink-soft)]">Subtotal</span>
                <span>₹{order.subtotalInr}</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[color:var(--color-ink-soft)]">Delivery fee</span>
                <span>₹{order.deliveryFeeInr}</span>
              </div>
              <div className="pt-2 border-t border-[color:var(--color-ink)]/8 flex items-center justify-between">
                <span className="font-serif text-[17px]">Total</span>
                <span className="font-serif text-[24px] text-[color:var(--color-forest)]">₹{order.totalInr}</span>
              </div>
              <div className="pt-2 text-[11.5px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/65">
                {order.paymentMethod === 'COD' ? 'Cash on delivery' : order.paymentMethod}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
