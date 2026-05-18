import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';
import { logActivity } from '@/lib/activity-log';

/**
 * One-shot seeding endpoint for the launch defaults — slot definitions,
 * Saver 30 plan, and top-up SKUs. Idempotent: each insert checks first and
 * leaves existing rows alone. Use this once from the admin browser after a
 * deploy to a fresh DB; remove the route or lock it down once production
 * stops adding new sites.
 */
export async function POST() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (admin.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ ok: false, error: 'SUPER_ADMIN only' }, { status: 403 });
  }

  const report: Record<string, string> = {};

  // delivery_fee_inr
  const feeRow = await prisma.siteSetting.findUnique({ where: { key: 'delivery_fee_inr' } });
  if (!feeRow) {
    await prisma.siteSetting.create({ data: { key: 'delivery_fee_inr', valueJson: 15 } });
    report.delivery_fee_inr = 'seeded ₹15';
  } else {
    report.delivery_fee_inr = `kept ${JSON.stringify(feeRow.valueJson)}`;
  }

  // slot_definitions — only seed when the row is missing OR currently empty,
  // so we don't trample a list an admin has already curated.
  const slotsRow = await prisma.siteSetting.findUnique({ where: { key: 'slot_definitions' } });
  const defaults = [
    { id: 'morning-9-11', label: '9 AM – 11 AM', startMin: 540, endMin: 660, capacity: 30, cutoffMinutesBefore: 300 },
    { id: 'evening-5-7', label: '5 PM – 7 PM', startMin: 1020, endMin: 1140, capacity: 30, cutoffMinutesBefore: 300 },
  ];
  if (!slotsRow) {
    await prisma.siteSetting.create({ data: { key: 'slot_definitions', valueJson: defaults } });
    report.slot_definitions = 'seeded 2 default slots';
  } else if (Array.isArray(slotsRow.valueJson) && slotsRow.valueJson.length === 0) {
    await prisma.siteSetting.update({ where: { key: 'slot_definitions' }, data: { valueJson: defaults } });
    report.slot_definitions = 'filled empty array with 2 defaults';
  } else if (Array.isArray(slotsRow.valueJson)) {
    // Heal step: legacy rows seeded before `cutoffMinutesBefore` existed
    // come back with the field missing, which makes getSlotAvailability
    // default cutoff to 0 and leave the slot bookable until its end-time.
    // Patch in the 5-hour default without touching anything else.
    const slots = slotsRow.valueJson as Array<Record<string, unknown>>;
    let healed = 0;
    for (const s of slots) {
      if (typeof s.cutoffMinutesBefore !== 'number') {
        s.cutoffMinutesBefore = 300;
        healed++;
      }
    }
    if (healed > 0) {
      await prisma.siteSetting.update({ where: { key: 'slot_definitions' }, data: { valueJson: slots as object } });
      report.slot_definitions = `kept existing (${slots.length}); patched ${healed} missing cutoffMinutesBefore → 300`;
    } else {
      report.slot_definitions = `kept existing (${slots.length} slots, all have cutoff)`;
    }
  } else {
    report.slot_definitions = 'kept existing (unrecognised shape)';
  }

  // Saver 30 plan
  const plan = await prisma.membershipPlan.findFirst({ where: { name: 'Saver 30' } });
  if (!plan) {
    await prisma.membershipPlan.create({
      data: {
        name: 'Saver 30',
        description: '20 free deliveries in 30 days. Pay ₹12 per delivery after that.',
        priceInr: 250,
        cycleDays: 30,
        includedDeliveries: 20,
        postIncludedFeeInr: 12,
        sortOrder: 0,
      },
    });
    report.plan_saver_30 = 'seeded';
  } else {
    report.plan_saver_30 = 'kept';
  }

  // Top-ups
  const topUps = [
    { name: '+5 deliveries', priceInr: 60, addedDeliveries: 5, sortOrder: 0 },
    { name: '+10 deliveries', priceInr: 110, addedDeliveries: 10, sortOrder: 1 },
    { name: '+20 deliveries', priceInr: 200, addedDeliveries: 20, sortOrder: 2 },
  ];
  const topUpReport: string[] = [];
  for (const t of topUps) {
    const exists = await prisma.membershipTopUp.findFirst({ where: { name: t.name } });
    if (exists) {
      topUpReport.push(`${t.name}: kept`);
    } else {
      await prisma.membershipTopUp.create({ data: t });
      topUpReport.push(`${t.name}: seeded`);
    }
  }
  report.top_ups = topUpReport.join('; ');

  // Wholesale vendors (idempotent — checks by slug)
  try {
    const { ensureWholesale } = await import('../../../../prisma/seed-wholesale');
    await ensureWholesale();
    report.wholesale_vendors = 'ensured Magarpatta Mandi + Magarpatta Daily + products';
  } catch (e) {
    report.wholesale_vendors = `failed: ${(e as Error).message}`;
  }

  await logActivity({
    actorRole: 'ADMIN',
    actorId: admin.id,
    actorName: admin.name,
    action: 'SEED_DEFAULTS',
    summary: `${admin.name} ran seed-defaults`,
    metadata: report,
  });

  return NextResponse.json({ ok: true, report });
}
