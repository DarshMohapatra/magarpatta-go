import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveAvailability } from '@/lib/product-availability';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const categorySlug = url.searchParams.get('category');
  const vendorSlug = url.searchParams.get('vendor');
  const q = url.searchParams.get('q');
  const vegOnly = url.searchParams.get('veg') === '1';

  // We no longer filter by inStock at the DB layer — a master-stock=true
  // product can be marked OOS today by a vendor daily override and vice
  // versa. resolveAvailability is the authority; we filter on its output.
  const where: Record<string, unknown> = {};
  if (categorySlug) where.category = { slug: categorySlug };
  if (vendorSlug) where.vendor = { slug: vendorSlug };
  if (vegOnly) where.isVeg = true;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
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
      };
    }),
  });
}
