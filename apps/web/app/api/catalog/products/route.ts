import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveAvailability } from '@/lib/product-availability';
import { getWholesaleOnlyMode } from '@/lib/settings';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const categorySlug = url.searchParams.get('category');
  const vendorSlug = url.searchParams.get('vendor');
  const q = url.searchParams.get('q');
  const vegOnly = url.searchParams.get('veg') === '1';

  // DB-level filter: a product is visible if its master is in stock OR a
  // vendor daily override exists (which might flip it either way). This
  // keeps the row set bounded — without it, we'd scan every product the
  // vendor ever added. resolveAvailability is still the final authority on
  // what gets returned to the client.
  const wholesaleOnly = await getWholesaleOnlyMode();
  const where: Record<string, unknown> = {
    OR: [
      { inStock: true },
      { dailyOverrides: { some: {} } },
    ],
  };
  if (wholesaleOnly) {
    where.vendor = { isWholesale: true };
  }
  if (categorySlug) where.category = { slug: categorySlug };
  if (vendorSlug) where.vendor = { ...((where.vendor as object | undefined) ?? {}), slug: vendorSlug };
  if (vegOnly) where.isVeg = true;
  if (q) {
    where.AND = [
      {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: [{ category: { order: 'asc' } }, { name: 'asc' }],
    include: {
      vendor: { select: { slug: true, name: true, hub: true } },
      category: { select: { slug: true, name: true } },
    },
  });

  const availability = await resolveAvailability(
    products.map((p) => ({ id: p.id, priceInr: p.priceInr, mrpInr: p.mrpInr, inStock: p.inStock })),
  );

  const visible = products.filter((p) => availability.get(p.id)?.inStock ?? p.inStock);

  return NextResponse.json({
    products: visible.map((p) => {
      const eff = availability.get(p.id)!;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        priceInr: eff.priceInr,
        mrpInr: eff.mrpInr,
        unit: p.unit,
        isVeg: p.isVeg,
        isRegulated: p.isRegulated,
        accent: p.accent,
        glyph: p.glyph,
        tagline: p.tagline,
        vendor: p.vendor,
        category: p.category,
        // Customer catalog badge: only emitted when today's override is in
        // effect, so the UI can show "Updated 11 mins ago" for the
        // freshness signal wholesale customers care about.
        priceUpdatedAt: eff.sourceLabel === 'today' && eff.updatedAt
          ? eff.updatedAt.toISOString()
          : null,
      };
    }),
  });
}
