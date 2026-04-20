import { PrismaClient } from '@prisma/client';
import { MAGARPATTA_SOCIETIES } from '../lib/societies';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Magarpatta societies + buildings…');

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
