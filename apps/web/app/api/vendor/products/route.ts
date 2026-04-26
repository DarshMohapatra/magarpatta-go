import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';
import { queueChange } from '@/lib/pending-change';

export async function GET() {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const [products, categories, pending] = await Promise.all([
    prisma.product.findMany({
      where: { vendorId: s.vendorId },
      orderBy: { createdAt: 'desc' },
      include: { category: { select: { slug: true, name: true } } },
    }),
    prisma.category.findMany({ orderBy: { order: 'asc' } }),
    prisma.pendingChange.findMany({
      where: { vendorId: s.vendorId, entity: 'PRODUCT', status: 'PENDING' },
      orderBy: { submittedAt: 'desc' },
    }),
  ]);
  return NextResponse.json({ ok: true, products, categories, pendingEdits: pending });
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

  const isRegulated = b.isRegulated ?? true;
  const priceInr = isRegulated ? mrp : (b.priceInr && b.priceInr > mrp ? Math.floor(b.priceInr) : mrp + 1);

  const payload = {
    vendorId: s.vendorId,
    categoryId: category.id,
    categorySlug,
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
  };

  const change = await queueChange({
    entity: 'PRODUCT',
    entityId: null,
    operation: 'CREATE',
    payload: payload as never,
    summary: `${s.shopName} · new item "${name}"`,
    vendorId: s.vendorId,
  });

  return NextResponse.json({ ok: true, queued: true, pendingId: change.id });
}
