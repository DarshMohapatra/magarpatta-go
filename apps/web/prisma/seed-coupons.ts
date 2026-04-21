import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COUPONS = [
  {
    code: 'WELCOME10',
    description: '10% off your first order · max ₹60',
    type: 'PERCENT' as const,
    percentOff: 10,
    maxDiscountInr: 60,
    minSubtotalInr: 200,
  },
  {
    code: 'SAVE50',
    description: '₹50 off on orders above ₹499',
    type: 'FLAT' as const,
    flatOffInr: 50,
    minSubtotalInr: 499,
  },
  {
    code: 'FREEDEL',
    description: 'Free delivery on orders above ₹299',
    type: 'FREE_DELIVERY' as const,
    minSubtotalInr: 299,
  },
  {
    code: 'MAGARPATTA20',
    description: '20% off · neighbours only · max ₹100',
    type: 'PERCENT' as const,
    percentOff: 20,
    maxDiscountInr: 100,
    minSubtotalInr: 300,
  },
  {
    code: 'JALEBI',
    description: '₹30 off · for the sweet tooth in you',
    type: 'FLAT' as const,
    flatOffInr: 30,
    minSubtotalInr: 150,
  },
];

async function main() {
  console.log('🎟️  Seeding coupons…');
  for (const c of COUPONS) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      create: c,
      update: c,
    });
  }
  const count = await prisma.coupon.count();
  console.log(`✅ ${count} coupons active.`);
  for (const c of COUPONS) console.log(`   · ${c.code.padEnd(14)} ${c.description}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
