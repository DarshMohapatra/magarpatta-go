import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';

interface PatchBody {
  name?: string;
  description?: string;
  mrpInr?: number;
  priceInr?: number;
  isRegulated?: boolean;
  isVeg?: boolean;
  inStock?: boolean;
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
  if (typeof b.name === 'string') data.name = b.name.trim();
  if (typeof b.description === 'string') data.description = b.description.trim() || null;
  if (typeof b.unit === 'string') data.unit = b.unit.trim() || null;
  if (typeof b.imageUrl === 'string') data.imageUrl = b.imageUrl.trim() || null;
  if (typeof b.accent === 'string') data.accent = b.accent.trim();
  if (typeof b.glyph === 'string') data.glyph = b.glyph.trim();
  if (typeof b.inStock === 'boolean') data.inStock = b.inStock;
  if (typeof b.isVeg === 'boolean') data.isVeg = b.isVeg;

  const isRegulated = typeof b.isRegulated === 'boolean' ? b.isRegulated : existing.isRegulated;
  if (typeof b.isRegulated === 'boolean') data.isRegulated = b.isRegulated;

  if (typeof b.mrpInr === 'number' || typeof b.priceInr === 'number') {
    const mrp = Math.max(0, Math.floor(b.mrpInr ?? existing.mrpInr ?? existing.priceInr));
    const price = isRegulated
      ? mrp
      : (typeof b.priceInr === 'number' && b.priceInr > mrp ? Math.floor(b.priceInr) : mrp + 1);
    data.mrpInr = mrp;
    data.priceInr = price;
  }

  const product = await prisma.product.update({ where: { id }, data });
  return NextResponse.json({ ok: true, product });
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

  // Soft-delete: set inStock=false and null the image. Hard-delete would fail
  // on historical orders (orderItems reference products).
  await prisma.product.update({ where: { id }, data: { inStock: false } });
  return NextResponse.json({ ok: true });
}
