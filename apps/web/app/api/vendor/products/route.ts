import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';
import { logActivity } from '@/lib/activity-log';
import { queueChange } from '@/lib/pending-change';
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
  // 'en' | 'hi' | 'mr' — the language the vendor typed `name` in. Stored
  // on the row so the admin reviewer / translations editor knows what they
  // already have when filling in the other two languages.
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
 * Add a new product to the vendor's menu. Goes through the PendingChange
 * queue — admin reviews + approves before customers see it. Translations
 * (Hindi/Marathi) are added by admin via /admin/translations, either at
 * approval time or anytime after.
 *
 * The vendor's typed name is mirrored into the source-language column
 * (nameHi or nameMr) so the partial localisation is already in place if the
 * vendor wrote in Hindi/Marathi; admin fills the missing slots later.
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
  const estimatedGrams = soldByWeight && b.estimatedGrams && b.estimatedGrams > 0
    ? Math.floor(b.estimatedGrams)
    : null;
  const nameSourceLang = asLocale(b.nameSourceLang);

  // Mirror the typed name into its language column so admin already has one
  // slot filled when they get to the translations editor. The other two
  // language columns stay null until admin types them.
  const payload = {
    vendorId: s.vendorId,
    categoryId: category.id,
    // categorySlug is stripped from the payload at approve-time — it's only
    // here for admin display while reviewing.
    categorySlug,
    name: typedName,
    nameHi: nameSourceLang === 'hi' ? typedName : null,
    nameMr: nameSourceLang === 'mr' ? typedName : null,
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
  };

  const change = await queueChange({
    entity: 'PRODUCT',
    entityId: null,
    operation: 'CREATE',
    payload: payload as never,
    summary: `${s.shopName} · add "${typedName}"`,
    vendorId: s.vendorId,
  });

  await logActivity({
    actorRole: 'VENDOR',
    actorId: s.vendorId,
    actorName: s.shopName,
    action: 'PRODUCT_CREATE_REQUEST',
    summary: `${s.shopName} submitted item "${typedName}" for review`,
    metadata: { name: typedName, nameSourceLang, pendingChangeId: change.id },
  });

  return NextResponse.json({ ok: true, queued: true, pendingId: change.id });
}
