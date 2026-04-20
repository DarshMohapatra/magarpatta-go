import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const categorySlug = url.searchParams.get('category');
  const vendorSlug = url.searchParams.get('vendor');
  const q = url.searchParams.get('q');
  const vegOnly = url.searchParams.get('veg') === '1';

  const where: Record<string, unknown> = { inStock: true };
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

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      priceInr: p.priceInr,
      mrpInr: p.mrpInr,
      unit: p.unit,
      isVeg: p.isVeg,
      isRegulated: p.isRegulated,
      accent: p.accent,
      glyph: p.glyph,
      tagline: p.tagline,
      vendor: p.vendor,
      category: p.category,
    })),
  });
}
