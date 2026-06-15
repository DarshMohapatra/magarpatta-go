import 'server-only';
import { prisma } from './prisma';
import { COMPETITOR_SOURCES, type CompetitorSource } from './competitor-prices';

/**
 * Curated June 2026 competitor price snapshot — single source of truth used
 * by both the admin manual-seed endpoint and the lazy-init that runs on
 * every fresh deploy. Mirrors agents/price-compare/competitor-data.ts.
 *
 * To extend coverage: add an entry keyed by the exact Product.name. Re-run
 * the seed (admin button OR redeploy) to pick up the new rows.
 */
export const SEED_DICT: Record<string, Partial<Record<CompetitorSource, { priceInr: number; note?: string }>>> = {
  'Onions':           { 'Blinkit': { priceInr: 42 }, 'Zepto': { priceInr: 44 }, 'BigBasket': { priceInr: 39 }, 'JioMart': { priceInr: 38 }, 'Swiggy Instamart': { priceInr: 43 } },
  'Potatoes':         { 'Blinkit': { priceInr: 35 }, 'Zepto': { priceInr: 36 }, 'BigBasket': { priceInr: 32 }, 'JioMart': { priceInr: 30 }, 'Swiggy Instamart': { priceInr: 34 } },
  'Tomatoes':         { 'Blinkit': { priceInr: 40, note: 'Volatile commodity — Blinkit surge-priced this week.' }, 'Zepto': { priceInr: 38 }, 'BigBasket': { priceInr: 32 }, 'JioMart': { priceInr: 30 }, 'Swiggy Instamart': { priceInr: 39 } },
  'Green Chillies':   { 'Blinkit': { priceInr: 16 }, 'Zepto': { priceInr: 18 }, 'BigBasket': { priceInr: 14 }, 'JioMart': { priceInr: 14 }, 'Swiggy Instamart': { priceInr: 17 } },
  'Coriander':        { 'Blinkit': { priceInr: 24 }, 'Zepto': { priceInr: 25 }, 'BigBasket': { priceInr: 22 }, 'JioMart': { priceInr: 20 }, 'Swiggy Instamart': { priceInr: 25 } },
  'Baby Spinach':     { 'Blinkit': { priceInr: 65 }, 'Zepto': { priceInr: 68, note: 'Premium organic pack — repriced to 250 g.' }, 'BigBasket': { priceInr: 55 }, 'JioMart': { priceInr: 52 }, 'Swiggy Instamart': { priceInr: 62 } },
  'Capsicum':         { 'Blinkit': { priceInr: 72 }, 'Zepto': { priceInr: 70 }, 'BigBasket': { priceInr: 65 }, 'JioMart': { priceInr: 60 }, 'Swiggy Instamart': { priceInr: 68 } },
  'Lemons':           { 'Blinkit': { priceInr: 48 }, 'Zepto': { priceInr: 50 }, 'BigBasket': { priceInr: 42 }, 'JioMart': { priceInr: 38 }, 'Swiggy Instamart': { priceInr: 45 } },
  'Bananas':          { 'Blinkit': { priceInr: 75 }, 'Zepto': { priceInr: 78 }, 'BigBasket': { priceInr: 65 }, 'JioMart': { priceInr: 60 }, 'Swiggy Instamart': { priceInr: 72 } },
  'Apples':           { 'Blinkit': { priceInr: 225, note: 'Premium grade Royal Delicious.' }, 'Zepto': { priceInr: 220 }, 'BigBasket': { priceInr: 200 }, 'JioMart': { priceInr: 185 }, 'Swiggy Instamart': { priceInr: 215 } },
  'Watermelon':       { 'Blinkit': { priceInr: 130, note: 'Sold per piece, ~3 kg.' }, 'Zepto': { priceInr: 125 }, 'BigBasket': { priceInr: 110 }, 'JioMart': { priceInr: 105 }, 'Swiggy Instamart': { priceInr: 128 } },
  'Pomegranate':      { 'Blinkit': { priceInr: 195 }, 'Zepto': { priceInr: 185 }, 'BigBasket': { priceInr: 175 }, 'JioMart': { priceInr: 160 }, 'Swiggy Instamart': { priceInr: 190 } },
  'Pineapple':        { 'Blinkit': { priceInr: 120 }, 'Zepto': { priceInr: 125 }, 'BigBasket': { priceInr: 105 }, 'JioMart': { priceInr: 99 },  'Swiggy Instamart': { priceInr: 115 } },
  'Alphonso Mangoes': { 'Blinkit': { priceInr: 799 }, 'Zepto': { priceInr: 749 }, 'BigBasket': { priceInr: 699 }, 'JioMart': { priceInr: 649 }, 'Swiggy Instamart': { priceInr: 775 } },
};

/**
 * Apply the SEED_DICT to the DB. Idempotent — upserts on (productId, source)
 * so re-running just refreshes prices. Returns the count of rows touched.
 */
export async function seedCompetitorPrices(): Promise<{ upserted: number; productsMatched: number }> {
  const products = await prisma.product.findMany({
    where: { name: { in: Object.keys(SEED_DICT) } },
    select: { id: true, name: true },
  });

  let upserted = 0;
  const ops: Promise<unknown>[] = [];
  for (const p of products) {
    const grid = SEED_DICT[p.name]!;
    for (const source of COMPETITOR_SOURCES) {
      const entry = grid[source];
      if (!entry) continue;
      ops.push(
        prisma.competitorPriceSnapshot.upsert({
          where: { productId_source: { productId: p.id, source } },
          create: { productId: p.id, source, priceInr: entry.priceInr, note: entry.note ?? null },
          update: { priceInr: entry.priceInr, note: entry.note ?? null, capturedAt: new Date() },
        }),
      );
      upserted++;
    }
  }
  await Promise.all(ops);
  return { upserted, productsMatched: products.length };
}

/**
 * Lazy bootstrap: only runs the seed when the table is empty. Designed to
 * be called from page loads — cheap when the seed has already happened.
 * Returns the count seeded (0 when nothing was needed).
 *
 * Race-condition note: concurrent requests on a cold DB might both observe
 * count=0 and trigger the seed in parallel. The upserts handle that safely
 * (one wins, the other's no-op).
 */
export async function ensureCompetitorPricesSeeded(): Promise<number> {
  const count = await prisma.competitorPriceSnapshot.count();
  if (count > 0) return 0;
  const result = await seedCompetitorPrices();
  console.log('[competitor-seed] auto-seeded on cold DB —', result);
  return result.upserted;
}
