import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';
import { logActivity } from '@/lib/activity-log';
import { COMPETITOR_SOURCES, type CompetitorSource } from '@/lib/competitor-prices';

interface Body {
  /** Map of source → price ₹. Missing keys are left untouched; null clears. */
  prices?: Partial<Record<CompetitorSource, number | null>>;
}

/**
 * Save a row of competitor prices for one product. Used by the
 * /admin/competitor-prices editor — admin types into each input cell and
 * the row autosaves on blur with the whole row's current state.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin || (admin.role !== 'SUPER_ADMIN' && admin.role !== 'OPS')) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!product) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const prices = body.prices ?? {};

  // Apply updates atomically. We treat 0 / null as "delete this snapshot".
  const ops: Promise<unknown>[] = [];
  for (const source of COMPETITOR_SOURCES) {
    if (!(source in prices)) continue;
    const v = prices[source];
    if (v == null || v <= 0) {
      ops.push(
        prisma.competitorPriceSnapshot
          .deleteMany({ where: { productId: id, source } }),
      );
    } else {
      ops.push(
        prisma.competitorPriceSnapshot.upsert({
          where: { productId_source: { productId: id, source } },
          create: { productId: id, source, priceInr: Math.floor(v) },
          update: { priceInr: Math.floor(v), capturedAt: new Date() },
        }),
      );
    }
  }
  await Promise.all(ops);
  revalidateTag('menu');

  await logActivity({
    actorRole: 'ADMIN',
    actorId: admin.id,
    actorName: admin.name,
    action: 'COMPETITOR_PRICES_EDIT',
    summary: `${admin.name} edited competitor prices on "${product.name}"`,
    metadata: { productId: id, sources: Object.keys(prices) },
  });

  return NextResponse.json({ ok: true });
}
