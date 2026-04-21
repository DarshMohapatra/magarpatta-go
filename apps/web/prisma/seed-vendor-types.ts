import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const META: Record<string, { vendorType: string; tags: string[]; rating: number; etaMinutes: number; costForTwo?: number }> = {
  'kalika':       { vendorType: 'sweets',     tags: ['Indian sweets', 'Chaat', 'Snacks'],     rating: 4.6, etaMinutes: 20, costForTwo: 250 },
  'dc':           { vendorType: 'grocery',    tags: ['Groceries', 'Fresh produce', 'Dairy'],   rating: 4.4, etaMinutes: 25 },
  'shraddha':     { vendorType: 'meat',       tags: ['Chicken', 'Mutton', 'Fish'],              rating: 4.5, etaMinutes: 30 },
  'mg-pharmacy':  { vendorType: 'pharmacy',   tags: ['OTC', 'Prescription', 'Essentials'],     rating: 4.7, etaMinutes: 18 },
  'starbucks':    { vendorType: 'cafe',       tags: ['Coffee', 'Specialty', 'Bakery'],          rating: 4.3, etaMinutes: 22, costForTwo: 500 },
  'mcdonalds':    { vendorType: 'restaurant', tags: ['Burgers', 'Fast food', 'American'],       rating: 4.2, etaMinutes: 25, costForTwo: 400 },
  'cbtl':         { vendorType: 'cafe',       tags: ['Coffee', 'Tea', 'Breakfast'],             rating: 4.3, etaMinutes: 23, costForTwo: 450 },
  'pop-tates':    { vendorType: 'restaurant', tags: ['American', 'Italian', 'Casual dining'],   rating: 4.4, etaMinutes: 30, costForTwo: 800 },
  'theobroma':    { vendorType: 'bakery',     tags: ['Cakes', 'Brownies', 'Patisserie'],        rating: 4.7, etaMinutes: 28, costForTwo: 400 },
};

async function main() {
  console.log('🏷️  Setting vendor types + tags + ratings…\n');
  for (const [slug, meta] of Object.entries(META)) {
    try {
      await prisma.vendor.update({
        where: { slug },
        data: {
          vendorType: meta.vendorType,
          tags: meta.tags,
          rating: meta.rating,
          etaMinutes: meta.etaMinutes,
          costForTwo: meta.costForTwo,
        },
      });
      console.log(`  ✓ ${slug.padEnd(15)} → ${meta.vendorType.padEnd(11)} · ${meta.tags.join(', ')}`);
    } catch {
      console.log(`  ⚠️  ${slug} not in DB`);
    }
  }

  const byType = await prisma.vendor.groupBy({ by: ['vendorType'], _count: { _all: true } });
  console.log('\nVendor distribution:');
  for (const row of byType) console.log(`  ${row.vendorType.padEnd(12)}: ${row._count._all}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
