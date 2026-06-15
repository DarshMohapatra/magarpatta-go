import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminSession } from '@/lib/admin-session';
import { logActivity } from '@/lib/activity-log';
import { seedCompetitorPrices, SEED_DICT } from '@/lib/competitor-seed';

/**
 * Admin-triggered re-seed. The same logic also runs automatically on cold
 * DB cold-starts via ensureCompetitorPricesSeeded() — this endpoint is the
 * "force refresh" button for when prices in the curated dictionary have
 * been updated and you want to push them into prod without waiting for
 * the next deploy.
 */
export async function POST() {
  const admin = await getAdminSession();
  if (!admin || (admin.role !== 'SUPER_ADMIN' && admin.role !== 'OPS')) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { upserted, productsMatched } = await seedCompetitorPrices();
  revalidateTag('menu');

  await logActivity({
    actorRole: 'ADMIN',
    actorId: admin.id,
    actorName: admin.name,
    action: 'COMPETITOR_PRICES_SEED',
    summary: `${admin.name} re-seeded ${upserted} competitor price rows`,
    metadata: { upserted, productsMatched },
  });

  return NextResponse.json({
    ok: true,
    upserted,
    productsMatched,
    dictionarySize: Object.keys(SEED_DICT).length,
  });
}
