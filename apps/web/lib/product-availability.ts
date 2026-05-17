import 'server-only';
import { prisma } from './prisma';
import { startOfDayUtc } from './slots';

/**
 * Effective price + stock for a product on a given day. The hierarchy is:
 *   1. Today's ProductDailyOverride row (if any field is set, it wins).
 *   2. The most recent prior override (carries forward yesterday's update).
 *   3. The master Product row.
 *
 * Vendors edit overrides at any time during the day — there's no cutoff, so
 * customer pages must read through this helper rather than reading Product
 * fields directly. The DB query orders by forDate DESC and grabs at most two
 * rows per product so this stays cheap even with hundreds of items.
 */

export interface EffectiveAvailability {
  productId: string;
  priceInr: number;
  mrpInr: number;
  inStock: boolean;
  sourceLabel: 'today' | 'carry-forward' | 'master';
  sourceDateIso?: string;
}

interface BaseFields {
  id: string;
  priceInr: number;
  mrpInr: number | null;
  inStock: boolean;
}

function dateIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function applyOverride(base: BaseFields, ov: {
  priceInr: number | null;
  mrpInr: number | null;
  inStock: boolean | null;
  forDate: Date;
}, sourceLabel: 'today' | 'carry-forward'): EffectiveAvailability {
  return {
    productId: base.id,
    priceInr: ov.priceInr ?? base.priceInr,
    mrpInr: ov.mrpInr ?? base.mrpInr ?? base.priceInr,
    inStock: ov.inStock ?? base.inStock,
    sourceLabel,
    sourceDateIso: dateIso(ov.forDate),
  };
}

/**
 * Batched resolver — pass an array of product IDs + their base fields and
 * get back the effective values for each. Used by:
 *  - the catalog GET endpoint (renders cards with today's price/stock)
 *  - cart revalidation at checkout (drops OOS items, surfaces price changes)
 *  - order placement (final price authority)
 */
export async function resolveAvailability(
  base: BaseFields[],
  asOf: Date = new Date(),
): Promise<Map<string, EffectiveAvailability>> {
  const today = startOfDayUtc(asOf);
  const ids = base.map((b) => b.id);
  if (ids.length === 0) return new Map();

  // Fetch every override row up to and including today for these products,
  // ordered newest first. Then take the first row per product.
  const overrides = await prisma.productDailyOverride.findMany({
    where: {
      productId: { in: ids },
      forDate: { lte: today },
    },
    orderBy: [{ productId: 'asc' }, { forDate: 'desc' }],
  });

  const latestByProduct = new Map<string, typeof overrides[number]>();
  for (const o of overrides) {
    if (!latestByProduct.has(o.productId)) latestByProduct.set(o.productId, o);
  }

  const out = new Map<string, EffectiveAvailability>();
  for (const b of base) {
    const ov = latestByProduct.get(b.id);
    if (ov) {
      const isToday = startOfDayUtc(ov.forDate).getTime() === today.getTime();
      out.set(b.id, applyOverride(b, ov, isToday ? 'today' : 'carry-forward'));
    } else {
      out.set(b.id, {
        productId: b.id,
        priceInr: b.priceInr,
        mrpInr: b.mrpInr ?? b.priceInr,
        inStock: b.inStock,
        sourceLabel: 'master',
      });
    }
  }
  return out;
}
