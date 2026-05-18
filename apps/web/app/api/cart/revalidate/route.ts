import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveAvailability } from '@/lib/product-availability';

interface ItemEcho {
  id: string;
  priceInr: number;
  mrpInr: number;
  quantity?: number;
}

/**
 * Cart guard for checkout. Takes the customer's cart snapshot and returns:
 *  - the *current* price/stock for each line (post-override),
 *  - what changed vs the cart's snapshot (price drift),
 *  - which items went OOS,
 *  - per-vendor min-order shortfalls.
 *
 * The checkout client uses all four so the "Continue to payment" button can
 * stay disabled until every blocker is cleared. /api/orders POST repeats
 * these checks as the authoritative pass.
 */
export async function POST(req: Request) {
  let body: { items: ItemEcho[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  if (!Array.isArray(body.items)) {
    return NextResponse.json({ ok: false, error: 'items must be an array' }, { status: 400 });
  }
  if (body.items.length === 0) {
    return NextResponse.json({ ok: true, items: [], changed: [], oos: [], minOrderBlockers: [] });
  }

  const products = await prisma.product.findMany({
    where: { id: { in: body.items.map((i) => i.id) } },
    select: {
      id: true, name: true, priceInr: true, mrpInr: true, inStock: true,
      vendor: { select: { id: true, name: true, minOrderInr: true } },
    },
  });

  const availability = await resolveAvailability(
    products.map((p) => ({ id: p.id, priceInr: p.priceInr, mrpInr: p.mrpInr, inStock: p.inStock })),
  );

  const items: Array<{ id: string; priceInr: number; mrpInr: number; inStock: boolean }> = [];
  const changed: Array<{ id: string; name: string; oldPriceInr: number; newPriceInr: number }> = [];
  const oos: Array<{ id: string; name: string }> = [];
  const perVendorSpend = new Map<string, { name: string; min: number; spend: number }>();

  for (const incoming of body.items) {
    const p = products.find((pp) => pp.id === incoming.id);
    if (!p) {
      oos.push({ id: incoming.id, name: 'Unavailable' });
      continue;
    }
    const eff = availability.get(p.id);
    if (!eff || !eff.inStock) {
      oos.push({ id: p.id, name: p.name });
      continue;
    }
    const qty = Math.max(1, Math.floor(incoming.quantity ?? 1));
    items.push({ id: p.id, priceInr: eff.priceInr, mrpInr: eff.mrpInr, inStock: true });
    if (eff.priceInr !== incoming.priceInr) {
      changed.push({ id: p.id, name: p.name, oldPriceInr: incoming.priceInr, newPriceInr: eff.priceInr });
    }
    // Aggregate per-vendor MRP-based spend (matches the order POST's rule).
    if (p.vendor.minOrderInr) {
      const row = perVendorSpend.get(p.vendor.id) ?? { name: p.vendor.name, min: p.vendor.minOrderInr, spend: 0 };
      row.spend += eff.mrpInr * qty;
      perVendorSpend.set(p.vendor.id, row);
    }
  }

  const minOrderBlockers = Array.from(perVendorSpend.values())
    .filter((v) => v.spend < v.min)
    .map((v) => ({ vendorName: v.name, requiredMin: v.min, currentSpend: v.spend, shortBy: v.min - v.spend }));

  return NextResponse.json({ ok: true, items, changed, oos, minOrderBlockers });
}
