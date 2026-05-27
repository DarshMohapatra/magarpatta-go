import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAllowedCategorySlugs } from '@/lib/settings';

export async function GET() {
  const allowed = await getAllowedCategorySlugs();
  const where = allowed.length > 0 ? { slug: { in: allowed } } : {};
  const categories = await prisma.category.findMany({
    where,
    orderBy: { order: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      glyph: true,
      _count: { select: { products: { where: { inStock: true } } } },
    },
  });

  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      glyph: c.glyph,
      productCount: c._count.products,
    })),
  });
}
