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
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
