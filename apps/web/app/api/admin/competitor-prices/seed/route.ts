import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';
import { logActivity } from '@/lib/activity-log';
import { COMPETITOR_SOURCES, type CompetitorSource } from '@/lib/competitor-prices';

/**
 * One-shot seed of the agent's curated June 2026 competitor snapshot into
 * the database. Match is by exact English product `name` — anything not
 * in the dictionary stays untouched and the admin fills it via the
 * /admin/competitor-prices editor.
 *
 * Idempotent — re-running just overwrites whatever's already there, so
 * it's safe to invoke any number of times. Useful for resetting demos.
 *
 * The dictionary mirrors agents/price-compare/competitor-data.ts. Keeping
 * it inline here (rather than importing the agent module) so this route
 * doesn't reach outside apps/web/ and so the agent stays a pure tool
 * decoupled from the production app.
 */
const SEED: Record<string, Partial<Record<CompetitorSource, { priceInr: number; note?: string }>>> = {
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

export async function POST() {
  const admin = await getAdminSession();
  if (!admin || (admin.role !== 'SUPER_ADMIN' && admin.role !== 'OPS')) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Pull every product whose English name is in the dictionary. exact match
  // is fine — we control the seed data.
  const products = await prisma.product.findMany({
    where: { name: { in: Object.keys(SEED) } },
    select: { id: true, name: true },
  });

  let upserted = 0;
  const ops: Promise<unknown>[] = [];
  for (const p of products) {
    const grid = SEED[p.name]!;
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

  // Customer menu reads competitorSnapshots inline — bust the cache so the
  // new prices are visible without waiting for the 30s TTL.
  revalidateTag('menu');

  await logActivity({
    actorRole: 'ADMIN',
    actorId: admin.id,
    actorName: admin.name,
    action: 'COMPETITOR_PRICES_SEED',
    summary: `${admin.name} seeded ${upserted} competitor price rows`,
    metadata: { upserted, productsMatched: products.length },
  });

  return NextResponse.json({
    ok: true,
    upserted,
    productsMatched: products.length,
    dictionarySize: Object.keys(SEED).length,
  });
}
