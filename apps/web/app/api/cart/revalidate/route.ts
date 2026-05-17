import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveAvailability } from '@/lib/product-availability';

interface ItemEcho {
  id: string;
  priceInr: number;
  mrpInr: number;
}

/**
 * Cart guard for checkout: takes the customer's cart snapshot, applies
 * today's vendor overrides, and returns the *current* price/stock for each
 * line plus a `changed` array describing what differs from what the client
 * is holding. The checkout client uses this to drop OOS items and surface
 * a "prices updated" banner before payment.
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
    return NextResponse.json({ ok: true, items: [], changed: [], oos: [] });
  }

  const products = await prisma.product.findMany({
    where: { id: { in: body.items.map((i) => i.id) } },
    select: { id: true, name: true, priceInr: true, mrpInr: true, inStock: true },
  });

  const availability = await resolveAvailability(
    products.map((p) => ({ id: p.id, priceInr: p.priceInr, mrpInr: p.mrpInr, inStock: p.inStock })),
  );

  const items: Array<{ id: string; priceInr: number; mrpInr: number; inStock: boolean }> = [];
  const changed: Array<{ id: string; name: string; oldPriceInr: number; newPriceInr: number }> = [];
  const oos: Array<{ id: string; name: string }> = [];

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
    items.push({ id: p.id, priceInr: eff.priceInr, mrpInr: eff.mrpInr, inStock: true });
    if (eff.priceInr !== incoming.priceInr) {
      changed.push({ id: p.id, name: p.name, oldPriceInr: incoming.priceInr, newPriceInr: eff.priceInr });
    }
  }

  return NextResponse.json({ ok: true, items, changed, oos });
}
