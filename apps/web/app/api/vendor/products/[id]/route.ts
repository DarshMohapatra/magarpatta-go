import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';
import { queueChange, pickFields } from '@/lib/pending-change';
import { translateMenuName } from '@/lib/translate';
import { asLocale } from '@/lib/i18n';

interface PatchBody {
  name?: string;
  nameSourceLang?: string;
  description?: string;
  mrpInr?: number;
  priceInr?: number;
  isRegulated?: boolean;
  isVeg?: boolean;
  inStock?: boolean;
  soldByWeight?: boolean;
  estimatedGrams?: number | null;
  unit?: string;
  imageUrl?: string;
  accent?: string;
  glyph?: string;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (s.approvalStatus !== 'APPROVED') {
    return NextResponse.json({ ok: false, error: 'Shop is not yet approved.' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || existing.vendorId !== s.vendorId) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  const b = (await req.json()) as PatchBody;
  const data: Record<string, unknown> = {};
  // Name + source language go through Gemini so the admin reviewer sees the
  // localized payload BEFORE approving — they're not blindly approving an
  // English-only edit. If the name didn't change we don't re-translate.
  if (typeof b.name === 'string') {
    const typedName = b.name.trim();
    data.name = typedName; // overwritten with translated.en below
    const sourceLang = asLocale(b.nameSourceLang ?? existing.nameSourceLang);
    const translated = await translateMenuName(typedName, sourceLang);
    data.name = translated.en;
    data.nameHi = translated.hi;
    data.nameMr = translated.mr;
    data.nameSourceLang = sourceLang;
  }
  if (typeof b.description === 'string') data.description = b.description.trim() || null;
  if (typeof b.unit === 'string') data.unit = b.unit.trim() || null;
  if (typeof b.imageUrl === 'string') data.imageUrl = b.imageUrl.trim() || null;
  if (typeof b.accent === 'string') data.accent = b.accent.trim();
  if (typeof b.glyph === 'string') data.glyph = b.glyph.trim();
  if (typeof b.isVeg === 'boolean') data.isVeg = b.isVeg;
  if (typeof b.isRegulated === 'boolean') data.isRegulated = b.isRegulated;

  // soldByWeight + estimatedGrams travel together. When the toggle flips off
  // we null the gram count to keep the column clean.
  if (typeof b.soldByWeight === 'boolean') {
    data.soldByWeight = b.soldByWeight;
    if (!b.soldByWeight) data.estimatedGrams = null;
  }
  if (b.estimatedGrams !== undefined) {
    const g = b.estimatedGrams;
    data.estimatedGrams = typeof g === 'number' && g > 0 ? Math.floor(g) : null;
  }

  const isRegulated = typeof b.isRegulated === 'boolean' ? b.isRegulated : existing.isRegulated;

  if (typeof b.mrpInr === 'number' || typeof b.priceInr === 'number') {
    const mrp = Math.max(0, Math.floor(b.mrpInr ?? existing.mrpInr ?? existing.priceInr));
    const price = isRegulated
      ? mrp
      : (typeof b.priceInr === 'number' && b.priceInr > mrp ? Math.floor(b.priceInr) : mrp + 1);
    data.mrpInr = mrp;
    data.priceInr = price;
  }

  // Stock toggle is operational (vendor knows when an item runs out — it must
  // hide from the menu instantly to prevent new orders). Apply immediately.
  if (typeof b.inStock === 'boolean') {
    await prisma.product.update({ where: { id }, data: { inStock: b.inStock } });
    revalidateTag('menu');
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true, queued: false });
  }

  const before = pickFields(existing as unknown as Record<string, unknown>, Object.keys(data));
  const change = await queueChange({
    entity: 'PRODUCT',
    entityId: id,
    operation: 'UPDATE',
    payload: data as never,
    before: before as never,
    summary: `${s.shopName} · edit "${existing.name}"`,
    vendorId: s.vendorId,
  });

  return NextResponse.json({ ok: true, queued: true, pendingId: change.id });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (s.approvalStatus !== 'APPROVED') {
    return NextResponse.json({ ok: false, error: 'Shop is not yet approved.' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || existing.vendorId !== s.vendorId) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  const change = await queueChange({
    entity: 'PRODUCT',
    entityId: id,
    operation: 'DELETE',
    payload: {} as never,
    before: { name: existing.name, inStock: existing.inStock } as never,
    summary: `${s.shopName} · remove "${existing.name}"`,
    vendorId: s.vendorId,
  });

  return NextResponse.json({ ok: true, queued: true, pendingId: change.id });
}
