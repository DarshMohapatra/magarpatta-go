import { PrismaClient } from '@prisma/client';

async function main() {
  const p = new PrismaClient();
  const items = await p.product.findMany({ orderBy: { name: 'asc' }, select: { name: true, imageUrl: true } });

  // Products with clearly wrong images — null them out so the glyph renders.
  const KNOWN_WRONG = new Set([
    'Crocin 500 Advance',           // molecular structure
    'Paracetamol 650mg',            // molecular/psychoactive — both wrong
    'Harpic Bathroom Cleaner',      // vacuum cleaner
    'Chicken Breast (Boneless)',    // live chickens in market
    'Chicken Keema',                // sausage making, not keema
    'Maggi Noodles Multipack',      // just the logo
  ]);

  let nulled = 0;
  for (const it of items) {
    if (KNOWN_WRONG.has(it.name) && it.imageUrl) {
      await p.product.update({ where: { name: it.name } as { name: string }, data: { imageUrl: null } }).catch(async () => {
        const prod = await p.product.findFirst({ where: { name: it.name } });
        if (prod) await p.product.update({ where: { id: prod.id }, data: { imageUrl: null } });
      });
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
  console.log(`\n✅ ${nulled} wrong images cleared to glyph.`);
  await p.$disconnect();
}

main();
