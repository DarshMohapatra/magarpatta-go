import { PrismaClient } from '@prisma/client';
import { MAGARPATTA_SOCIETIES } from '../lib/societies';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Magarpatta societies + buildings…');

  // Drop any society that's no longer in our data (e.g. Heliconia I/II merged
  // into single Heliconia, or Nyati Evolve removed as not part of Magarpatta).
  const currentNames = MAGARPATTA_SOCIETIES.map((s) => s.name);
  const removed = await prisma.society.deleteMany({
    where: { name: { notIn: currentNames } },
  });
  if (removed.count > 0) {
    console.log(`  ✂  removed ${removed.count} stale societies (cascaded to their buildings)`);
  }

  // Also drop any buildings from retained societies that are no longer in our data.
  for (const s of MAGARPATTA_SOCIETIES) {
    const existing = await prisma.society.findUnique({ where: { name: s.name } });
    if (!existing) continue;
    const keepNames = s.buildings.map((b) => b.name);
    await prisma.building.deleteMany({
      where: { societyId: existing.id, name: { notIn: keepNames } },
    });
  }

  for (const s of MAGARPATTA_SOCIETIES) {
    const society = await prisma.society.upsert({
      where: { name: s.name },
      create: { name: s.name, verified: s.verified ?? false },
      update: { verified: s.verified ?? false },
    });

    for (const b of s.buildings) {
      await prisma.building.upsert({
        where: { societyId_name: { societyId: society.id, name: b.name } },
        create: {
          societyId: society.id,
          name: b.name,
          floors: b.floors,
          flatsPerFloor: b.flatsPerFloor,
        },
        update: {
          floors: b.floors,
          flatsPerFloor: b.flatsPerFloor,
        },
      });
    }

    console.log(`  ✓ ${s.name} (${s.buildings.length} buildings${s.verified ? ', verified' : ''})`);
  }

  const societyCount = await prisma.society.count();
  const buildingCount = await prisma.building.count();
  console.log(`\n✅ Done. ${societyCount} societies, ${buildingCount} buildings.`);

  console.log('\n🌱 Seeding default site settings…');
  const defaults: Array<{ key: string; valueJson: object | number }> = [
    { key: 'delivery_fee_inr', valueJson: 15 },
    {
      key: 'slot_definitions',
      valueJson: [
        { id: 'morning-9-11', label: '9 AM – 11 AM', startMin: 540, endMin: 660, capacity: 30 },
        { id: 'evening-5-7', label: '5 PM – 7 PM', startMin: 1020, endMin: 1140, capacity: 30 },
      ],
    },
  ];
  for (const d of defaults) {
    const existing = await prisma.siteSetting.findUnique({ where: { key: d.key } });
    if (existing) {
      console.log(`  ↻ ${d.key} already set (${JSON.stringify(existing.valueJson)}) — leaving as-is`);
      continue;
    }
    await prisma.siteSetting.create({ data: { key: d.key, valueJson: d.valueJson as object } });
    console.log(`  ✓ ${d.key} = ${JSON.stringify(d.valueJson)}`);
  }

  console.log('\n🌱 Seeding launch membership plan + top-ups…');
  const planExists = await prisma.membershipPlan.findFirst({ where: { name: 'Saver 30' } });
  if (planExists) {
    console.log(`  ↻ Saver 30 plan already present — leaving as-is`);
  } else {
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
    console.log(`  ✓ Saver 30 plan created (₹250 / 20 deliveries / 30 days, ₹12 after)`);
  }

  const topUps = [
    { name: '+5 deliveries', priceInr: 60, addedDeliveries: 5, sortOrder: 0 },
    { name: '+10 deliveries', priceInr: 110, addedDeliveries: 10, sortOrder: 1 },
    { name: '+20 deliveries', priceInr: 200, addedDeliveries: 20, sortOrder: 2 },
  ];
  for (const t of topUps) {
    const exists = await prisma.membershipTopUp.findFirst({ where: { name: t.name } });
    if (exists) {
      console.log(`  ↻ Top-up "${t.name}" already present`);
      continue;
    }
    await prisma.membershipTopUp.create({ data: t });
    console.log(`  ✓ Top-up "${t.name}" (₹${t.priceInr})`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
