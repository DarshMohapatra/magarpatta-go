import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';
import { logActivity } from '@/lib/activity-log';
import { translateMenuName } from '@/lib/gemini';
import { asLocale } from '@/lib/i18n';

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
  // 'en' | 'hi' | 'mr' — the language the vendor typed `name` in. Server
  // translates to the other two via Gemini.
  nameSourceLang?: string;
  description?: string;
  categorySlug?: string;
  mrpInr?: number;
  priceInr?: number;
  isRegulated?: boolean;
  isVeg?: boolean;
  // For loose produce sold by weight: priceInr is then the estimated price
  // tied to estimatedGrams. Vendor reconciles actual weight before delivery.
  soldByWeight?: boolean;
  estimatedGrams?: number;
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
  const typedName = (b.name ?? '').trim();
  const mrp = Math.max(0, Math.floor(b.mrpInr ?? 0));
  const categorySlug = (b.categorySlug ?? '').trim();
  if (!typedName || mrp <= 0 || !categorySlug) {
    return NextResponse.json({ ok: false, error: 'Name, MRP, and category are required.' }, { status: 400 });
  }

  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!category) return NextResponse.json({ ok: false, error: 'Unknown category.' }, { status: 400 });

  const isRegulated = b.isRegulated ?? true;
  const priceInr = isRegulated ? mrp : (b.priceInr && b.priceInr > mrp ? Math.floor(b.priceInr) : mrp + 1);
  const soldByWeight = b.soldByWeight === true;
  // Estimated grams is only meaningful when the item sells by weight. We
  // accept it even when soldByWeight=false (vendor toggled and re-toggled),
  // but null it out on save to keep the column clean.
  const estimatedGrams = soldByWeight && b.estimatedGrams && b.estimatedGrams > 0
    ? Math.floor(b.estimatedGrams)
    : null;

  // Auto-translate the typed name into all three languages. If Gemini is
  // unreachable or the API key is missing, the helper returns the source
  // text in every slot — the row is still valid and the customer renderer
  // falls back to `name` (English column).
  const nameSourceLang = asLocale(b.nameSourceLang);
  const translated = await translateMenuName(typedName, nameSourceLang);

  const product = await prisma.product.create({
    data: {
      vendorId: s.vendorId,
      categoryId: category.id,
      name: translated.en,
      nameHi: translated.hi,
      nameMr: translated.mr,
      nameSourceLang,
      description: b.description?.trim() || null,
      priceInr,
      mrpInr: mrp,
      isRegulated,
      isVeg: b.isVeg ?? true,
      soldByWeight,
      estimatedGrams,
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
    summary: `${s.shopName} added item "${translated.en}" (live)`,
    metadata: { productId: product.id, name: translated.en, nameSourceLang, instant: true },
  });

  return NextResponse.json({
    ok: true,
    productId: product.id,
    translated: { en: translated.en, hi: translated.hi, mr: translated.mr },
  });
}
