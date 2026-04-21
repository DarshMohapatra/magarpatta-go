import { PrismaClient } from '@prisma/client';

async function main() {
  const p = new PrismaClient();
  const products = await p.product.findMany({
    where: { inStock: true },
    orderBy: [{ category: { order: 'asc' } }, { name: 'asc' }],
    include: { vendor: { select: { name: true } }, category: { select: { name: true } } },
  });

  const missing = products.filter((x) => !x.imageUrl);
  const loremflickr = products.filter((x) => x.imageUrl?.includes('loremflickr'));
  const wiki = products.filter((x) => x.imageUrl?.includes('wikimedia'));

  console.log(`\n📸 Image audit — ${products.length} products in stock\n`);
  console.log(`   ✓ Wikipedia   : ${wiki.length}`);
  console.log(`   △ Loremflickr : ${loremflickr.length}`);
  console.log(`   ✗ None        : ${missing.length} (using stylized glyph)\n`);

  if (missing.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PRIORITY — products needing real images (downloaded by user)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let currentCat = '';
    for (const prod of missing) {
      if (prod.category.name !== currentCat) {
        currentCat = prod.category.name;
        console.log(`\n  ─ ${currentCat}`);
      }
      console.log(`     · ${prod.name.padEnd(36)} — ${prod.vendor.name}`);
    }
  }

  if (loremflickr.length > 0) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SECONDARY — loremflickr placeholders (may still be wrong)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    for (const prod of loremflickr) {
      console.log(`     · ${prod.name.padEnd(36)} — ${prod.vendor.name}`);
    }
  }

  await p.$disconnect();
}

main();
