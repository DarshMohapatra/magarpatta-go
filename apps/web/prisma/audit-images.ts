import { PrismaClient } from '@prisma/client';

async function main() {
  const p = new PrismaClient();
  const items = await p.product.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, imageUrl: true } });

  // Products with clearly wrong images — null them out so the glyph renders.
  const KNOWN_WRONG = new Set([
    'Crocin 500 Advance',
    'Paracetamol 650mg',
    'Harpic Bathroom Cleaner',
    'Chicken Breast (Boneless)',
    'Chicken Keema',
    'Maggi Noodles Multipack',
  ]);

  let nulled = 0;
  for (const it of items) {
    if (KNOWN_WRONG.has(it.name) && it.imageUrl) {
      await p.product.update({ where: { id: it.id }, data: { imageUrl: null } });
      nulled++;
    }
  }

  console.log(`\nImage source audit (${items.length} products):\n`);
  for (const i of items) {
    const cleaned = KNOWN_WRONG.has(i.name) ? null : i.imageUrl;
    const src = !cleaned
      ? '[GLYPH]       '
      : cleaned.includes('loremflickr')
        ? '[LOREMFLICKR] '
        : cleaned.includes('wikimedia')
          ? '[WIKI]        '
          : '[OTHER]       ';
    const tail = cleaned ? cleaned.split('/').slice(-2).join('/').slice(0, 55) : '';
    console.log(`  ${src}${i.name.padEnd(32)} ${tail}`);
  }
  console.log(`\nOK ${nulled} wrong images cleared to glyph.`);
  await p.$disconnect();
}

main();
