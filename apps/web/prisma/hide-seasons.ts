import { PrismaClient } from '@prisma/client';

async function main() {
  const p = new PrismaClient();
  const result = await p.product.updateMany({
    where: { vendor: { slug: { in: ['starbucks', 'bakers'] } } },
    data: { inStock: false },
  });
  console.log(`✓ Hid ${result.count} Seasons Mall products (Starbucks + Baker's Basket) from catalog.`);
  console.log(`  Flip back with: UPDATE "Product" SET "inStock"=true WHERE "vendorId" IN (...);`);
  await p.$disconnect();
}

main();
