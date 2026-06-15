'use client';

import { useEffect, useState } from 'react';
import type { SavingsRow } from '@/lib/competitor-prices';

/**
 * Rotating "vs Blinkit, save X%" overlay that sits absolutely-positioned
 * on the product card. Hidden by default; visible only when the customer
 * hovers the card (desktop) or taps it (mobile). While visible, cycles
 * through the savings rows every 3.5 s with a crossfade.
 *
 * Sources where we're NOT cheaper have been filtered out upstream by
 * buildSavingsRows() — this component only ever sees winning comparisons.
 * If the list is empty (we're not cheaper than anyone), the component
 * renders nothing and the card is unaffected.
 *
 * Hover detection is left to the parent — this component just listens
 * for a `visible` prop. The parent product card sets visible=true on
 * mouseenter/focus/pointerdown.
 */
export function PriceCompareBadge({
  visible,
  rows,
}: {
  visible: boolean;
  rows: SavingsRow[];
}) {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  // Reset to the biggest win each time the overlay re-shows. Customer
  // sees the most impressive comparison first.
  useEffect(() => {
    if (visible) setIdx(0);
  }, [visible]);

  // Cycle while visible. Crossfade by toggling opacity 250 ms before the
  // index swap.
  useEffect(() => {
    if (!visible || rows.length <= 1) return;
    const fadeOut = setTimeout(() => setFading(true), 3250);
    const swap = setTimeout(() => {
      setIdx((i) => (i + 1) % rows.length);
      setFading(false);
    }, 3500);
    return () => { clearTimeout(fadeOut); clearTimeout(swap); };
  }, [visible, idx, rows.length]);

  if (rows.length === 0) return null;
  const current = rows[idx];

  return (
    <div
      aria-live="polite"
      className={
        'absolute left-2 right-2 bottom-2 z-10 pointer-events-none ' +
        'rounded-lg bg-[color:var(--color-forest)] text-[color:var(--color-cream)] ' +
        'px-2.5 py-1.5 text-[11px] leading-tight shadow-lg ' +
        'transition-all duration-300 ease-out ' +
        (visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-1 pointer-events-none')
      }
    >
      <span className={'block transition-opacity duration-200 ' + (fading ? 'opacity-0' : 'opacity-100')}>
        <span className="font-medium">{current.source}</span>
        <span className="opacity-80"> ₹{current.theirPriceInr}</span>
        <span className="mx-1.5 opacity-50">·</span>
        <span className="font-semibold">save {current.savingsPct}%</span>
        {rows.length > 1 && (
          <span className="ml-1.5 opacity-60 text-[9.5px] tabular-nums">
            {idx + 1}/{rows.length}
          </span>
        )}
      </span>
    </div>
  );
}
