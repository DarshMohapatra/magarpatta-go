'use client';

import { useEffect, useState } from 'react';
import type { SavingsRow } from '@/lib/competitor-prices';

/**
 * Inline price-compare ticker. Sits directly below the product price (NOT
 * absolutely positioned over the card) so it never hides the price, and
 * stays visible at all times — no hover or tap needed.
 *
 * The text cycles every 4 s between two formats:
 *   - "Our app: X% lower than {source}"    — celebratory, headline form
 *   - "Other apps: ₹{min}–₹{max}"           — informational range form
 * …per the reference screenshots. Skipping sources where we're not
 * cheaper is enforced upstream by buildSavingsRows().
 *
 * When rows is empty (no data OR we don't beat anyone) the component
 * renders nothing and the card layout is unaffected.
 */
export function PriceCompareBadge({ rows }: { rows: SavingsRow[] }) {
  // Build the rotation: one entry per "winning" source (with the
  // competitor's name AND their actual price AND the % saved) plus a
  // summary "Other apps: ₹X-Y" entry at the end. Customer sees something
  // fresh every few seconds without it feeling spammy.
  const messages: string[] = [];
  for (const r of rows) {
    messages.push(`${r.source} ₹${r.theirPriceInr} — save ${r.savingsPct}%`);
  }
  if (rows.length > 1) {
    const prices = rows.map((r) => r.theirPriceInr).sort((a, b) => a - b);
    const lo = prices[0];
    const hi = prices[prices.length - 1];
    messages.push(lo === hi ? `Other apps: ₹${lo}` : `Other apps: ₹${lo}–₹${hi}`);
  }

  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  // Cycle. Skip the timer if there's only one message.
  useEffect(() => {
    if (messages.length <= 1) return;
    const fadeOut = setTimeout(() => setFading(true), 3700);
    const swap = setTimeout(() => {
      setIdx((i) => (i + 1) % messages.length);
      setFading(false);
    }, 4000);
    return () => { clearTimeout(fadeOut); clearTimeout(swap); };
  }, [idx, messages.length]);

  if (messages.length === 0) return null;
  const current = messages[idx] ?? messages[0];

  return (
    <div
      aria-live="polite"
      className="mt-1 flex items-center gap-1.5 text-[10.5px] sm:text-[11px] leading-tight text-[color:var(--color-primary)] min-h-[14px]"
    >
      {/* infinity / loop icon — matches the reference style */}
      <svg
        viewBox="0 0 24 12"
        width="14"
        height="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        className="shrink-0 opacity-80"
      >
        <path d="M5 6c0-2 2-3.5 4-3.5s3 1.5 4 3.5 2 3.5 4 3.5 4-1.5 4-3.5-2-3.5-4-3.5-3 1.5-4 3.5-2 3.5-4 3.5-4-1.5-4-3.5z" />
      </svg>
      <span
        className={'truncate font-medium transition-opacity duration-200 ' + (fading ? 'opacity-0' : 'opacity-100')}
      >
        {current}
      </span>
    </div>
  );
}
