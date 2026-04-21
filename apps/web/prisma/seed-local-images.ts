import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Product name (as stored in DB) -> local image path (served from public/)
const LOCAL_IMAGES: Record<string, string> = {
  // Restaurants
  'McSpicy Chicken Burger':         '/products/mcspicy.png',
  'Big Mac':                         '/products/big-mac.jpg',
  'McAloo Tikki Burger':             '/products/mcaloo.jpg',
  'World Famous Fries':              '/products/mcd-fries.jpg',
  'Cheese Margherita Pizza':         '/products/margherita-pizza.jpg',
  'BBQ Chicken Sizzler':             '/products/bbq-chicken-sizzler.jpg',
  'Spaghetti Aglio e Olio':          '/products/aglio-olio.jpg',
  "Pop Tate's Classic Burger":       '/products/classic-burger.jpg',

  // Bakery
  'Chocolate Dutch Truffle Cake':    '/products/theobroma-truffle-cake.jpg',
  'Theobroma Brownie Pack':           '/products/theobroma-brownies.jpg',
  'Butter Croissant':                 '/products/theobroma-croissant.jpg',
  'Red Velvet Pastry':                '/products/theobroma-red-velvet.jpg',
  'Starbucks Butter Croissant':      '/products/starbucks-croissant.jpg',
  'Starbucks Chocolate Chip Cookie': '/products/starbucks-cookie.jpg',
  'Blueberry Muffin':                 '/products/blueberry-muffin.jpg',

  // Beverages (CBTL)
  'Classic Cappuccino':               '/products/cbtl-cappuccino.jpg',
  'Mocha Ice Blended':                '/products/cbtl-mocha.jpg',
  'Vanilla Earl Grey Tea':            '/products/cbtl-earl-grey.jpg',

  // Fresh Meat
  'Chicken Breast (Boneless)':        '/products/chicken-breast.jpg',
  'Chicken Thigh (Bone-in)':          '/products/chicken-thigh.jpg',
  'Chicken Keema':                     '/products/chicken-keema.jpg',
  'Mutton Curry Cut':                 '/products/mutton-curry.jpg',

  // Medicines
  'Crocin 500 Advance':               '/products/crocin.jpg',
  'Paracetamol 650mg':                '/products/paracetamol.jpg',
  'Dettol Handwash Refill':           '/products/dettol-handwash.jpg',
  'ORS Rehydration Sachet':           '/products/ors-sachet.jpg',

  // Sweets & Snacks
  'Malai Sandwich':                   '/products/malai-sandwich.jpg',

  // Fresh Produce
  'Green Chillies':                   '/products/green-chillies.jpg',

  // Pantry
  'Tata Salt':                        '/products/tata-salt.jpg',
  'Fortune Sunflower Oil':            '/products/sunflower-oil.jpg',

  // Daily Essentials
  'Harpic Bathroom Cleaner':          '/products/harpic.png',
  'Maggi Noodles Multipack':          '/products/maggi.jpg',
};

async function main() {
  console.log('🖼️  Wiring local product images…\n');
  let updated = 0;
  let notFound = 0;

  for (const [name, url] of Object.entries(LOCAL_IMAGES)) {
    const product = await prisma.product.findFirst({ where: { name } });
    if (!product) {
      console.warn(`  ⚠️  product not found: ${name}`);
      notFound++;
      continue;
    }
    await prisma.product.update({ where: { id: product.id }, data: { imageUrl: url } });
    console.log(`  ✓  ${name.padEnd(40)} → ${url}`);
    updated++;
  }

  console.log(`\n✅ ${updated} wired · ${notFound} not found in DB.`);

  // Final state
  const withImages = await prisma.product.count({ where: { inStock: true, imageUrl: { not: null } } });
  const total = await prisma.product.count({ where: { inStock: true } });
  console.log(`   Coverage: ${withImages}/${total} in-stock products now have images.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
