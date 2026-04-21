'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, cartSubtotal } from '@/lib/cart';
import { ProductGlyph } from '@/components/product-glyph';
import { cn } from '@/lib/utils';

interface Props {
  session: {
    phone: string;
    name: string | null;
    society: string | null;
    building: string | null;
    flat: string | null;
  };
}

export function CheckoutClient({ session }: Props) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const deliveryFee = items.length > 0 ? 25 : 0;
  const total = subtotal + deliveryFee;

  const hasAddress = Boolean(session.society && session.building && session.flat);

  async function placeOrder() {
    if (items.length === 0) return;
    if (!hasAddress) {
      setError('Please set a delivery address first.');
      return;
    }
    setPlacing(true);
    setError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
          notes: notes.trim() || undefined,
          paymentMethod: 'COD',
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Could not place order');
        setPlacing(false);
        return;
      }
      clear();
      router.push(`/orders/${data.orderId}`);
    } catch {
      setError('Network error. Try again.');
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <section className="pt-28 pb-24 min-h-[60vh]">
        <div className="mx-auto max-w-[720px] px-6 lg:px-10 text-center">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Checkout</div>
          <h1 className="mt-4 font-serif text-[44px] leading-[0.98] tracking-[-0.02em]">
            Your cart is <span className="italic text-[color:var(--color-forest)]">empty.</span>
          </h1>
          <p className="mt-4 text-[14.5px] text-[color:var(--color-ink-soft)]">Add something from the menu and come back here.</p>
          <a href="/menu" className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full text-[14px] font-medium bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)]">
            Browse the menu
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-24 pb-20">
      <div className="mx-auto max-w-[1080px] px-6 lg:px-10">
        <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Checkout</div>
        <h1 className="mt-3 font-serif text-[44px] lg:text-[56px] leading-[0.98] tracking-[-0.02em]">
          Almost there, <span className="italic text-[color:var(--color-forest)]">{session.name?.split(' ')[0] ?? 'neighbour'}.</span>
        </h1>

        <div className="mt-10 grid lg:grid-cols-[1.4fr_1fr] gap-8">
          {/* Left — items + address + notes */}
          <div className="space-y-6">
            {/* Delivery address card */}
            <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-3">
                Delivering to
              </div>
              {hasAddress ? (
                <>
                  <div className="font-serif text-[24px] leading-tight text-[color:var(--color-ink)]">
                    Flat {session.flat}, {session.building}
                  </div>
                  <div className="mt-1 text-[13.5px] text-[color:var(--color-ink-soft)]">{session.society}, Magarpatta City</div>
                  <div className="mt-2 text-[12px] text-[color:var(--color-ink-soft)]/75">
                    +91 {session.phone}
                    {session.name && <span> · {session.name}</span>}
                  </div>
                  <a href="/signup" className="mt-4 inline-block text-[12.5px] text-[color:var(--color-forest)] underline underline-offset-4">
                    Change address →
                  </a>
                </>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-serif text-[20px] leading-tight text-[color:var(--color-terracotta)]">
                      No delivery address yet.
                    </div>
                    <div className="mt-1 text-[13px] text-[color:var(--color-ink-soft)]">
                      Add your society, building and flat to continue.
                    </div>
                  </div>
                  <a href="/signup" className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium bg-[color:var(--color-forest)] text-[color:var(--color-cream)]">
                    Set address
                  </a>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[color:var(--color-ink)]/8 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">
                {items.length} item{items.length === 1 ? '' : 's'}
              </div>
              <ul className="divide-y divide-[color:var(--color-ink)]/8">
                {items.map((it) => (
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
                      <div className="font-serif text-[17px]">₹{it.priceInr * it.qty}</div>
                      <div className="text-[11px] text-[color:var(--color-ink-soft)]/70">× {it.qty}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Notes */}
            <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-5">
              <label className="block text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/70">
                Delivery notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Gate instructions, preferred entrance, or anything else for the rider…"
                rows={3}
                maxLength={280}
                className="mt-2 w-full bg-transparent outline-none text-[14px] placeholder:text-[color:var(--color-ink-soft)]/50 resize-none"
              />
            </div>
          </div>

          {/* Right — totals + pay button */}
          <aside className="lg:sticky lg:top-24 lg:self-start rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6 space-y-4">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">Total</div>

            <div className="flex items-center justify-between text-[14px]">
              <span className="text-[color:var(--color-ink-soft)]">Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-[color:var(--color-ink-soft)]">Delivery fee</span>
              <span>₹{deliveryFee}</span>
            </div>
            <div className="pt-3 border-t border-[color:var(--color-ink)]/8 flex items-center justify-between">
              <span className="font-serif text-[20px]">Total</span>
              <span className="font-serif text-[28px] text-[color:var(--color-forest)]">₹{total}</span>
            </div>

            <div className="text-[12px] text-[color:var(--color-ink-soft)]/75 pt-2">
              Paying with <span className="font-medium text-[color:var(--color-ink)]">Cash on Delivery</span>.
              UPI &amp; card arrive with Razorpay activation.
            </div>

            {error && <p className="text-[12.5px] text-[color:var(--color-terracotta)]">{error}</p>}

            <button
              onClick={placeOrder}
              disabled={placing || !hasAddress}
              className={cn(
                'w-full rounded-2xl px-5 py-4 font-medium text-[14.5px] transition-colors flex items-center justify-center gap-2',
                hasAddress && !placing
                  ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)]'
                  : 'bg-[color:var(--color-ink)]/8 text-[color:var(--color-ink-soft)]/60 cursor-not-allowed',
              )}
            >
              {placing ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" className="animate-spin">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="28" strokeDashoffset="10" />
                  </svg>
                  Placing order…
                </>
              ) : (
                <>
                  Place order · ₹{total}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>

            <p className="text-[11px] text-center text-[color:var(--color-ink-soft)]/65 pt-1">
              ~25 minute delivery · riders track live on the next screen
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
