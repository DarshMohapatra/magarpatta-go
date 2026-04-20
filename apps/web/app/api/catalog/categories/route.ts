import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const categories = await prisma.category.findMany({
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
