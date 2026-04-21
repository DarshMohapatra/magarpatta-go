'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { OrderStatus, PaymentMethod } from '@prisma/client';
import { OrderTracker, useLiveOrder } from './order-tracker';
import { ProductGlyph } from '@/components/product-glyph';
import { expectedStatusForElapsed, deliveryOtp } from '@/lib/orders';
import { useCart } from '@/lib/cart';
import { GIFT_WRAP_FEE, INSURANCE_FEE } from '@/lib/pricing';

interface OrderItem {
  id: string;
  productId: string;
  name: string;
  vendorName: string;
  unit: string | null;
  priceInr: number;
  mrpInr?: number | null;
  isRegulated: boolean;
  quantity: number;
  accent: string | null;
  glyph: string | null;
  imageUrl: string | null;
}

interface OrderData {
  id: string;
  status: OrderStatus;
  placedAt: string;
  deliveredAt: string | null;
  riderName: string | null;
  subtotalInr: number;
  convenienceInr: number;
  taxInr: number;
  addOnsInr: number;
  deliveryFeeInr: number;
  discountInr: number;
  couponCode: string | null;
  totalInr: number;
  giftWrap: boolean;
  insurance: boolean;
  society: string;
  building: string;
  flat: string;
  vendorName: string | null;
  vendorHub: string | null;
  paymentMethod: PaymentMethod;
  notes: string | null;
  items: OrderItem[];
}

function paymentLabel(m: PaymentMethod): string {
  switch (m) {
    case 'COD': return 'Cash on delivery';
    case 'UPI': return 'UPI';
    case 'CARD': return 'Card';
    case 'NET_BANKING': return 'Net banking';
  }
}

export function OrderDetailClient({ order }: { order: OrderData }) {
  const router = useRouter();
  const cartAdd = useCart((s) => s.add);
  const cartClear = useCart((s) => s.clear);

  const placedMs = new Date(order.placedAt).getTime();
  const wallElapsed = Math.floor((Date.now() - placedMs) / 1000);
  const initialStatus =
    order.status === 'DELIVERED' || order.status === 'CANCELLED'
      ? order.status
      : expectedStatusForElapsed(wallElapsed);
  // If already delivered, freeze the counter at (deliveredAt − placedAt).
  const initialElapsed =
    initialStatus === 'DELIVERED' && order.deliveredAt
      ? Math.floor((new Date(order.deliveredAt).getTime() - placedMs) / 1000)
      : wallElapsed;

  const live = useLiveOrder(order.id, {
    status: initialStatus,
    elapsedSeconds: initialElapsed,
  });

  const placedDate = new Date(order.placedAt);

  function reorder() {
    cartClear();
    for (const it of order.items) {
      for (let i = 0; i < it.quantity; i++) {
        cartAdd({
          id: it.productId,
          name: it.name,
          priceInr: it.priceInr,
          mrpInr: it.mrpInr ?? it.priceInr,
          isRegulated: it.isRegulated,
          unit: it.unit,
          accent: it.accent,
          glyph: it.glyph,
          imageUrl: it.imageUrl,
          vendorName: it.vendorName,
        });
      }
    }
    router.push('/checkout');
  }

  return (
    <section className="pt-24 pb-20">
      <div className="mx-auto max-w-[1080px] px-6 lg:px-10">
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-[12.5px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)] mb-6">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M10 6H2m0 0l3.5 3.5M2 6l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All orders
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">
              Order #{order.id.slice(-6)}
            </div>
            <h1 className="mt-3 font-serif text-[32px] sm:text-[40px] lg:text-[48px] leading-[1.02] tracking-[-0.02em]">
              {live.status === 'DELIVERED' ? (
                <>Delivered. <span className="italic text-[color:var(--color-forest)]">Enjoy.</span></>
              ) : (
                <>Your order is <span className="italic text-[color:var(--color-forest)]">on the way.</span></>
              )}
            </h1>
            <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)]">
              Placed {placedDate.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST
            </p>
          </div>
          <button
            onClick={reorder}
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13.5px] font-medium border border-[color:var(--color-forest)]/40 bg-[color:var(--color-paper)] text-[color:var(--color-forest)] hover:bg-[color:var(--color-forest)] hover:text-[color:var(--color-cream)] transition-colors"
            title="Re-add these items to your cart"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M11 4H3m0 0l3-3M3 4l3 3M3 10h8m0 0l-3-3m3 3l-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Reorder
          </button>
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

        {/* Rider assignment card */}
        {order.riderName && live.status !== 'DELIVERED' && live.status !== 'CANCELLED' && (
          <div className="mt-6 rounded-2xl border border-[color:var(--color-forest)]/20 bg-[color:var(--color-forest)]/5 p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] flex items-center justify-center text-[14px] font-medium">
              {order.riderName[0]}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-forest)]">Your rider</div>
              <div className="mt-0.5 font-serif text-[18px] leading-tight">
                {order.riderName} is on this one.
              </div>
              <p className="text-[12px] text-[color:var(--color-ink-soft)]/80">
                A neighbour on a Magarpatta-registered cycle. They&apos;ll ask for the OTP below on drop.
              </p>
            </div>
          </div>
        )}

        {/* Delivery OTP — shown while the rider is inbound, hidden after delivery */}
        {live.status !== 'DELIVERED' && live.status !== 'CANCELLED' && (
          <div className="mt-6 rounded-2xl border border-[color:var(--color-saffron)]/30 bg-gradient-to-br from-[color:var(--color-saffron)]/10 to-[color:var(--color-gold)]/8 p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">Delivery OTP</div>
              <div className="mt-1 font-serif text-[20px] leading-tight">Read this to the rider on drop.</div>
              <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-soft)]/80">
                The rider will ask for this 4-digit code before handing over your order.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 font-mono text-[32px] font-semibold tracking-[0.25em] text-[color:var(--color-ink)]">
              {deliveryOtp(order.id).split('').map((d, i) => (
                <span key={i} className="inline-flex h-12 w-10 items-center justify-center rounded-lg bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/12 shadow-sm">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

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
                    <div className="font-serif text-[17px]">₹{(it.mrpInr ?? it.priceInr) * it.quantity}</div>
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
                <span className="text-[color:var(--color-ink-soft)]">Subtotal (MRP)</span>
                <span>₹{order.subtotalInr}</span>
              </div>
              {order.convenienceInr > 0 && (
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[color:var(--color-ink-soft)]">Convenience fee</span>
                  <span>₹{order.convenienceInr}</span>
                </div>
              )}
              {order.taxInr > 0 && (
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[color:var(--color-ink-soft)]">Tax (5%)</span>
                  <span>₹{order.taxInr}</span>
                </div>
              )}
              {order.giftWrap && (
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[color:var(--color-ink-soft)]">Gift wrap</span>
                  <span>₹{GIFT_WRAP_FEE}</span>
                </div>
              )}
              {order.insurance && (
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[color:var(--color-ink-soft)]">Insurance</span>
                  <span>₹{INSURANCE_FEE}</span>
                </div>
              )}
              {(() => {
                const tip = order.addOnsInr - (order.giftWrap ? GIFT_WRAP_FEE : 0) - (order.insurance ? INSURANCE_FEE : 0);
                return tip > 0 ? (
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[color:var(--color-ink-soft)]">Rider tip</span>
                    <span>₹{tip}</span>
                  </div>
                ) : null;
              })()}
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[color:var(--color-ink-soft)]">Delivery fee</span>
                <span>{order.deliveryFeeInr === 0 ? 'FREE' : `₹${order.deliveryFeeInr}`}</span>
              </div>
              {order.discountInr > 0 && order.couponCode && (
                <div className="flex items-center justify-between text-[13px] text-[color:var(--color-forest)]">
                  <span>{order.couponCode} discount</span>
                  <span>−₹{order.discountInr}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[color:var(--color-ink)]/8 flex items-center justify-between">
                <span className="font-serif text-[17px]">Total</span>
                <span className="font-serif text-[24px] text-[color:var(--color-forest)]">₹{order.totalInr}</span>
              </div>
              <div className="pt-2 text-[11.5px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/65">
                Paid via {paymentLabel(order.paymentMethod)}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
