import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';
import { logActivity } from '@/lib/activity-log';

interface Body {
  name?: string;
  nameHi?: string | null;
  nameMr?: string | null;
}

/**
 * Inline-save a single product's English / Hindi / Marathi name. Used by
 * the /admin/translations editor. Restricted to SUPER_ADMIN / OPS —
 * SUPPORT role can read but not write catalog content.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin || (admin.role !== 'SUPER_ADMIN' && admin.role !== 'OPS')) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!existing) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const data: Record<string, string | null> = {};
  if (typeof body.name === 'string') {
    const v = body.name.trim();
    if (v.length === 0) return NextResponse.json({ ok: false, error: 'English name cannot be empty.' }, { status: 400 });
    data.name = v;
  }
  // Hindi + Marathi columns accept null to "clear" — the renderer falls back
  // to English when null. An empty string also resolves to null.
  if (body.nameHi !== undefined) data.nameHi = (body.nameHi ?? '').trim() || null;
  if (body.nameMr !== undefined) data.nameMr = (body.nameMr ?? '').trim() || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true, noChanges: true });
  }

  await prisma.product.update({ where: { id }, data });
  revalidateTag('menu');

  await logActivity({
    actorRole: 'ADMIN',
    actorId: admin.id,
    actorName: admin.name,
    action: 'PRODUCT_TRANSLATE',
    summary: `${admin.name} edited translations for "${existing.name}"`,
    metadata: { productId: id, fields: Object.keys(data) },
  });

  return NextResponse.json({ ok: true });
}
