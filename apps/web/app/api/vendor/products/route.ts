import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';

export async function GET() {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { vendorId: s.vendorId },
      orderBy: { createdAt: 'desc' },
      include: { category: { select: { slug: true, name: true } } },
    }),
    prisma.category.findMany({ orderBy: { order: 'asc' } }),
  ]);
  return NextResponse.json({ ok: true, products, categories });
}

interface CreateBody {
  name?: string;
  description?: string;
  categorySlug?: string;
  mrpInr?: number;
  priceInr?: number;
  isRegulated?: boolean;
  isVeg?: boolean;
  unit?: string;
  imageUrl?: string;
  accent?: string;
  glyph?: string;
}

export async function POST(req: Request) {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (s.approvalStatus !== 'APPROVED') {
    return NextResponse.json({ ok: false, error: 'Shop is not yet approved.' }, { status: 403 });
  }

  const b = (await req.json()) as CreateBody;
  const name = (b.name ?? '').trim();
  const mrp = Math.max(0, Math.floor(b.mrpInr ?? 0));
  const categorySlug = (b.categorySlug ?? '').trim();
  if (!name || mrp <= 0 || !categorySlug) {
    return NextResponse.json({ ok: false, error: 'Name, MRP, and category are required.' }, { status: 400 });
  }

  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!category) return NextResponse.json({ ok: false, error: 'Unknown category.' }, { status: 400 });

  // Legal Metrology: regulated MRP items must sell AT MRP. Non-regulated items
  // (prepared/loose) are marked up by +₹1 hyper-local fee.
  const isRegulated = b.isRegulated ?? true;
  const priceInr = isRegulated ? mrp : (b.priceInr && b.priceInr > mrp ? Math.floor(b.priceInr) : mrp + 1);

  const product = await prisma.product.create({
    data: {
      vendorId: s.vendorId,
      categoryId: category.id,
      name,
      description: b.description?.trim() || null,
      priceInr,
      mrpInr: mrp,
      isRegulated,
      isVeg: b.isVeg ?? true,
      unit: b.unit?.trim() || null,
      imageUrl: b.imageUrl?.trim() || null,
      accent: b.accent?.trim() || 'forest',
      glyph: b.glyph?.trim() || category.glyph || 'leaf',
      inStock: true,
    },
  });
  return NextResponse.json({ ok: true, product });
}
