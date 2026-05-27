import 'server-only';
import { prisma } from './prisma';

/**
 * Vendor settlement generator. For every DELIVERED order in a given window
 * we compute the vendor's payable (gross − commission). One settlement row
 * per vendor per window, idempotent by the (vendorId, periodStart,
 * periodEnd) unique key — re-running the same generator on the same window
 * updates an existing PAYABLE row in place (and skips rows already PAID).
 *
 * The cron at /api/cron/settlements wakes up daily and asks for "yesterday
 * in IST" so a freshly closed business day rolls into a payable settlement
 * by 12:30 AM IST the next morning.
 */

const IST_TZ_OFFSET_MIN = 5 * 60 + 30;

/** Returns the IST-midnight UTC instant for the given date. */
function istMidnightUtc(year: number, monthIdx0: number, day: number): Date {
  // Build an ISO string with the +05:30 suffix so the host TZ (Vercel runs
  // in UTC) doesn't shift the boundary. JavaScript parses it back to the
  // correct UTC instant.
  const m = String(monthIdx0 + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return new Date(`${year}-${m}-${d}T00:00:00+05:30`);
}

/** Today (IST) start and tomorrow (IST) start as UTC Dates. */
export function istDayBoundsForOffset(daysAgo: number): { periodStart: Date; periodEnd: Date } {
  // Convert "now" into IST wall-clock to figure out which IST day we land on
  // after applying daysAgo. Building the bounds from the wall clock keeps
  // the function deterministic across host timezones.
  const nowUtcMs = Date.now();
  const istNow = new Date(nowUtcMs + IST_TZ_OFFSET_MIN * 60 * 1000);
  const istY = istNow.getUTCFullYear();
  const istM = istNow.getUTCMonth();
  const istD = istNow.getUTCDate();
  const startIst = istMidnightUtc(istY, istM, istD - daysAgo);
  const endIst = istMidnightUtc(istY, istM, istD - daysAgo + 1);
  return { periodStart: startIst, periodEnd: endIst };
}

export interface GenerateResult {
  vendorsProcessed: number;
  settlementsUpserted: number;
  skippedAlreadyPaid: number;
}

export async function generateSettlementsForPeriod(periodStart: Date, periodEnd: Date): Promise<GenerateResult> {
  // Group delivered orders in [start, end) by vendor and sum subtotalInr.
  // We only count orders the vendor is actually owed for — DELIVERED with a
  // non-null vendorId. CANCELLED, refunded or rider-concierge orders fall
  // outside this set.
  const rows = await prisma.order.groupBy({
    by: ['vendorId'],
    where: {
      status: 'DELIVERED',
      vendorId: { not: null },
      deliveredAt: { gte: periodStart, lt: periodEnd },
    },
    _count: { _all: true },
    _sum: { subtotalInr: true },
  });

  let upserted = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.vendorId) continue;
    const gross = row._sum.subtotalInr ?? 0;
    const orderCount = row._count._all;
    const vendor = await prisma.vendor.findUnique({
      where: { id: row.vendorId },
      select: { commissionPct: true },
    });
    const commissionPct = vendor?.commissionPct ?? 15;
    const commissionInr = Math.round((gross * commissionPct) / 100);
    const payableInr = gross - commissionInr;

    // Look up an existing row first; if it's already PAID we leave the
    // historical record alone (re-running the cron mustn't unsettle a
    // payment that's already gone out).
    const existing = await prisma.vendorSettlement.findUnique({
      where: { vendorId_periodStart_periodEnd: { vendorId: row.vendorId, periodStart, periodEnd } },
      select: { id: true, status: true },
    });
    if (existing?.status === 'PAID') {
      skipped += 1;
      continue;
    }

    await prisma.vendorSettlement.upsert({
      where: { vendorId_periodStart_periodEnd: { vendorId: row.vendorId, periodStart, periodEnd } },
      create: {
        vendorId: row.vendorId,
        periodStart,
        periodEnd,
        orderCount,
        grossInr: gross,
        commissionPct,
        commissionInr,
        payableInr,
        status: 'PAYABLE',
      },
      update: {
        orderCount,
        grossInr: gross,
        commissionPct,
        commissionInr,
        payableInr,
      },
    });
    upserted += 1;
  }

  return { vendorsProcessed: rows.length, settlementsUpserted: upserted, skippedAlreadyPaid: skipped };
}

/** Convenience: regenerate yesterday's IST day (typical nightly cron). */
export async function generateYesterdaySettlement(): Promise<GenerateResult> {
  const { periodStart, periodEnd } = istDayBoundsForOffset(1);
  return generateSettlementsForPeriod(periodStart, periodEnd);
}
