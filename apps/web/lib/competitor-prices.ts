import 'server-only';

export type CompetitorSource =
  | 'Blinkit'
  | 'Zepto'
  | 'BigBasket'
  | 'JioMart'
  | 'Swiggy Instamart';

export const COMPETITOR_SOURCES: CompetitorSource[] = [
  'Blinkit',
  'Zepto',
  'BigBasket',
  'JioMart',
  'Swiggy Instamart',
];

/**
 * Lightweight projection of a CompetitorPriceSnapshot row, shaped for the
 * customer-facing hover badge on each product card. We deliberately keep
 * this off the heavy Product object — the menu page selects it once per
 * product and threads it down to the card.
 */
export interface CompetitorPriceLite {
  source: CompetitorSource;
  priceInr: number;
  note: string | null;
}

/**
 * Compute the per-competitor savings row that the rotating hover badge
 * cycles through. Implements the "skip" rule: only competitors where
 * Magarpatta is strictly cheaper appear in the rotation. Sorted by
 * descending savings so the biggest win shows first.
 */
export interface SavingsRow {
  source: CompetitorSource;
  theirPriceInr: number;
  ourPriceInr: number;
  savingsInr: number;
  savingsPct: number;
}

export function buildSavingsRows(
  ourPriceInr: number,
  competitors: CompetitorPriceLite[],
): SavingsRow[] {
  const rows: SavingsRow[] = [];
  for (const c of competitors) {
    if (c.priceInr <= ourPriceInr) continue; // skip when we're not cheaper
    const savingsInr = c.priceInr - ourPriceInr;
    const savingsPct = Math.round((savingsInr / c.priceInr) * 100);
    rows.push({
      source: c.source,
      theirPriceInr: c.priceInr,
      ourPriceInr,
      savingsInr,
      savingsPct,
    });
  }
  rows.sort((a, b) => b.savingsInr - a.savingsInr);
  return rows;
}

/**
 * Average across every competitor (winners + losers) — used as the at-add
 * snapshot for the cart-total "you're saving ₹X" line. Returns null when
 * there's no competitor data, so the cart line can hide gracefully.
 */
export function avgCompetitorPrice(competitors: CompetitorPriceLite[]): number | null {
  if (competitors.length === 0) return null;
  const sum = competitors.reduce((s, c) => s + c.priceInr, 0);
  return Math.round(sum / competitors.length);
}
