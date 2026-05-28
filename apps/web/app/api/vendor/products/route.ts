import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';
import { logActivity } from '@/lib/activity-log';

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
    // Edits + removes still go through PendingChange — only adds are
    // approval-free. Keep this read so the menu drawer can still surface
    // the "you have N edits awaiting admin review" badge.
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

/**
 * Add a new product to the vendor's menu. As of 2026-05 this WRITES STRAIGHT
 * TO THE CATALOG — no admin approval gate. Vendors needed faster turnaround
 * on stocking new items at launch, and the old PendingChange flow created
 * a multi-hour lag on something the vendor is best placed to judge anyway.
 *
 * Edits to existing items (PATCH /api/vendor/products/[id]) and removals
 * still go through PendingChange. The asymmetry is intentional: a new row
 * the customer hasn't seen yet has zero blast radius, but an edit/remove
 * affects an item the customer may already have in their cart.
 */
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

  // Burn the public menu cache so the new item shows up for customers on
  // the next read, not after the 30s TTL.
  revalidateTag('menu');

  await logActivity({
    actorRole: 'VENDOR',
    actorId: s.vendorId,
    actorName: s.shopName,
    action: 'PRODUCT_CREATE',
    summary: `${s.shopName} added item "${name}" (live)`,
    metadata: { productId: product.id, name, instant: true },
  });

  return NextResponse.json({ ok: true, productId: product.id });
}
