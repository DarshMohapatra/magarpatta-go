import { NextResponse } from 'next/server';
import { generateYesterdaySettlement, generateSettlementsForPeriod, istDayBoundsForOffset } from '@/lib/settlements';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Vercel Cron tick — fires nightly to roll yesterday's DELIVERED orders
 * into VendorSettlement rows. Schedule lives in vercel.json
 * (00:30 IST = 19:00 UTC).
 *
 * Manual reruns: `?daysAgo=N` regenerates the settlement N days ago in IST.
 * Already-PAID rows are left untouched.
 *
 * Vercel sends GET; POST is supported so a script (or admin tool) can
 * reuse the same handler.
 */
async function tick(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  const url = new URL(req.url);
  const daysAgoRaw = url.searchParams.get('daysAgo');
  const daysAgo = daysAgoRaw ? Number(daysAgoRaw) : null;

  let result;
  let bounds;
  if (daysAgo !== null && Number.isFinite(daysAgo) && daysAgo >= 0 && daysAgo < 30) {
    bounds = istDayBoundsForOffset(daysAgo);
    result = await generateSettlementsForPeriod(bounds.periodStart, bounds.periodEnd);
  } else {
    bounds = istDayBoundsForOffset(1);
    result = await generateYesterdaySettlement();
  }

  return NextResponse.json({
    ok: true,
    period: {
      start: bounds.periodStart.toISOString(),
      end: bounds.periodEnd.toISOString(),
    },
    ...result,
  });
}

export const GET = tick;
export const POST = tick;
