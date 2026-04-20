'use client';

import { useEffect } from 'react';
import { useCart, cartSubtotal } from '@/lib/cart';
import { ProductGlyph } from './product-glyph';
import { cn } from '@/lib/utils';

export function CartDrawer() {
  const items = useCart((s) => s.items);
  const open = useCart((s) => s.drawerOpen);
  const close = useCart((s) => s.closeDrawer);
  const increment = useCart((s) => s.increment);
  const decrement = useCart((s) => s.decrement);
  const remove = useCart((s) => s.remove);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  const subtotal = cartSubtotal(items);
  const deliveryFee = items.length > 0 ? 25 : 0;
  const total = subtotal + deliveryFee;

  return (
    <>
      <div
        onClick={close}
        className={cn(
          'fixed inset-0 z-[60] bg-[color:var(--color-ink)]/40 backdrop-blur-sm transition-opacity',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden={!open}
      />
      <aside
        className={cn(
          'fixed top-0 right-0 bottom-0 z-[70] w-full sm:w-[420px] bg-[color:var(--color-cream)] border-l border-[color:var(--color-ink)]/10 shadow-[-24px_0_60px_-24px_rgba(15,15,14,0.3)] transition-transform duration-300 ease-out flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-hidden={!open}
        aria-label="Cart"
      >
        <header className="flex items-center justify-between px-6 py-5 border-b border-[color:var(--color-ink)]/8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">
              Your cart
            </div>
            <h2 className="mt-1 font-serif text-[26px] leading-tight text-[color:var(--color-ink)]">
              {items.length === 0
                ? 'Nothing here yet.'
                : items.length === 1
                  ? '1 thing lined up'
                  : `${items.length} things lined up`}
            </h2>
          </div>
          <button
            onClick={close}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[color:var(--color-ink)]/5"
            aria-label="Close cart"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-8 text-center">
              <div className="h-14 w-14 rounded-2xl bg-[color:var(--color-ink)]/5 flex items-center justify-center mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M4 6h2l2 12h11M8 18a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4zM8 10h14l-1.5 7H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="font-serif text-[22px] leading-tight text-[color:var(--color-ink)] max-w-xs">
                Pick something from the menu and it lands here.
              </p>
              <button
                onClick={close}
                className="mt-6 text-[13px] font-medium text-[color:var(--color-forest)] hover:underline underline-offset-4"
              >
                Back to menu →
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--color-ink)]/8">
              {items.map((it) => (
                <li key={it.id} className="flex gap-4 px-6 py-4">
                  <div
                    className="h-16 w-16 shrink-0 rounded-xl flex items-center justify-center overflow-hidden relative"
                    style={{
                      backgroundColor: `color-mix(in srgb, var(--color-${it.accent ?? 'forest'}) 12%, transparent)`,
                    }}
                  >
                    {it.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.imageUrl}
                        alt={it.name}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="scale-[0.55] origin-center">
                        <ProductGlyph glyph={it.glyph} accent={it.accent} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-[17px] leading-tight text-[color:var(--color-ink)] truncate">
                      {it.name}
                    </h3>
                    <p className="text-[11.5px] text-[color:var(--color-ink-soft)]/75">
                      {it.vendorName}
                      {it.unit && <span> · {it.unit}</span>}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-full border border-[color:var(--color-ink)]/15 bg-[color:var(--color-paper)]">
                        <button onClick={() => decrement(it.id)} className="h-7 w-7 text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]">
                          −
                        </button>
                        <span className="w-6 text-center text-[12.5px] font-medium">{it.qty}</span>
                        <button onClick={() => increment(it.id)} className="h-7 w-7 text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]">
                          +
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="font-serif text-[17px] text-[color:var(--color-ink)]">
                          ₹{it.priceInr * it.qty}
                        </div>
                        <button
                          onClick={() => remove(it.id)}
                          className="text-[11px] text-[color:var(--color-ink-soft)]/65 hover:text-[color:var(--color-terracotta)] underline underline-offset-2"
                        >
                          remove
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="border-t border-[color:var(--color-ink)]/8 bg-[color:var(--color-paper)]/60 px-6 py-5 space-y-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[color:var(--color-ink-soft)]">Subtotal</span>
              <span className="text-[color:var(--color-ink)]">₹{subtotal}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[color:var(--color-ink-soft)]">Delivery fee</span>
              <span className="text-[color:var(--color-ink)]">₹{deliveryFee}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[color:var(--color-ink)]/8">
              <span className="font-serif text-[18px] text-[color:var(--color-ink)]">Total</span>
              <span className="font-serif text-[22px] text-[color:var(--color-forest)]">₹{total}</span>
            </div>

            <button
              disabled
              className="mt-2 w-full rounded-2xl bg-[color:var(--color-ink)]/5 text-[color:var(--color-ink-soft)]/65 px-5 py-4 font-medium text-[14px] cursor-not-allowed flex items-center justify-center gap-2"
            >
              Checkout · coming soon
              <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/50">
                Razorpay pending KYC
              </span>
            </button>
            <p className="text-[11.5px] text-center text-[color:var(--color-ink-soft)]/70">
              We&apos;ll enable checkout the moment Razorpay KYC clears.
            </p>
          </footer>
        )}
      </aside>
    </>
  );
}
