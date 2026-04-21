import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// New category for sit-down restaurants
const NEW_CATEGORIES = [
  { slug: 'restaurants', name: 'Restaurants & Dining', glyph: 'sweet', order: 15 },
];

// New Seasons Mall vendors — restaurant, grocery, bakery, cafe
const NEW_VENDORS = [
  {
    slug: 'theobroma',
    name: 'Theobroma · Seasons',
    hub: 'Seasons Mall',
    accent: 'terracotta',
    description: 'Brownies, patisserie, loaves. A Mumbai institution now at Seasons Mall.',
  },
  {
    slug: 'blue-tokai',
    name: 'Blue Tokai · Seasons',
    hub: 'Seasons Mall',
    accent: 'forest',
    description: 'Single-estate Indian coffee. Hand-brewed pour-overs and whole-bean bags.',
  },
  {
    slug: 'mainland-china',
    name: 'Mainland China · Seasons',
    hub: 'Seasons Mall',
    accent: 'terracotta',
    description: 'Indo-Chinese classics packed to travel well across the short hop.',
  },
  {
    slug: 'foodhall',
    name: 'Foodhall · Seasons',
    hub: 'Seasons Mall',
    accent: 'saffron',
    description: 'Premium grocery — imported, artisanal, curated. Stock-up run without the mall walk.',
  },
];

interface ProductSeed {
  vendor: string;
  category: string;
  name: string;
  description?: string;
  priceInr: number;
  mrpInr?: number;
  unit?: string;
  isVeg?: boolean;
  isRegulated?: boolean;
  accent?: string;
  glyph?: string;
  tagline?: string;
}

const NEW_PRODUCTS: ProductSeed[] = [
  // Theobroma — bakery
  { vendor: 'theobroma', category: 'bakery', name: 'Chocolate Dutch Truffle Cake', description: 'Signature dark-chocolate layer cake with ganache.', priceInr: 821, mrpInr: 820, unit: '500g',   isRegulated: false, accent: 'terracotta', glyph: 'loaf', tagline: 'Iconic' },
  { vendor: 'theobroma', category: 'bakery', name: 'Brownie Pack',                 description: 'Warm, fudgy chocolate brownies. Four per box.',       priceInr: 421, mrpInr: 420, unit: 'Pack of 4', isRegulated: false, accent: 'terracotta', glyph: 'loaf' },
  { vendor: 'theobroma', category: 'bakery', name: 'Red Velvet Pastry',            description: 'Cream-cheese frosting, single-serve pastry.',          priceInr: 171, mrpInr: 170, unit: '1 pc',    isRegulated: false, accent: 'terracotta', glyph: 'loaf' },
  { vendor: 'theobroma', category: 'bakery', name: 'Butter Croissant',             description: 'Laminated all-butter croissant.',                      priceInr: 141, mrpInr: 140, unit: '1 pc',    isRegulated: false, accent: 'saffron',    glyph: 'loaf' },

  // Blue Tokai — cafe / beverages
  { vendor: 'blue-tokai', category: 'beverages', name: 'Vienna Roast Pour-Over',    description: 'Hand-brewed pour-over. Medium-dark roast.',             priceInr: 251, mrpInr: 250, unit: '240ml',  isRegulated: false, accent: 'forest', glyph: 'cup' },
  { vendor: 'blue-tokai', category: 'beverages', name: 'Attikan Estate Beans',      description: 'Single-estate whole beans. Chocolate, plum, spice notes.', priceInr: 551, mrpInr: 550, unit: '250g',  isRegulated: false, accent: 'forest', glyph: 'cup' },
  { vendor: 'blue-tokai', category: 'beverages', name: 'Iced Americano',            description: 'Double shot espresso over ice.',                         priceInr: 221, mrpInr: 220, unit: '354ml', isRegulated: false, accent: 'forest', glyph: 'cup' },
  { vendor: 'blue-tokai', category: 'beverages', name: 'Cold Brew Concentrate',     description: '24-hour steeped concentrate. Dilute with milk or water.',priceInr: 501, mrpInr: 500, unit: '1 L',   isRegulated: false, accent: 'forest', glyph: 'cup' },

  // Mainland China — restaurants
  { vendor: 'mainland-china', category: 'restaurants', name: 'Veg Hakka Noodles',        description: 'Stir-fried noodles with julienned vegetables.',         priceInr: 321, mrpInr: 320, unit: 'Serves 2', isRegulated: false, accent: 'saffron',    glyph: 'sweet' },
  { vendor: 'mainland-china', category: 'restaurants', name: 'Chicken Manchurian (Dry)', description: 'Wok-tossed chicken in hot garlic sauce.',                priceInr: 421, mrpInr: 420, unit: 'Serves 1', isRegulated: false, accent: 'terracotta', glyph: 'sweet', isVeg: false },
  { vendor: 'mainland-china', category: 'restaurants', name: 'Vegetable Spring Rolls',   description: 'Crisp-shelled with cabbage-carrot filling. Served with schezwan.', priceInr: 281, mrpInr: 280, unit: '4 pcs',   isRegulated: false, accent: 'saffron',    glyph: 'sweet' },
  { vendor: 'mainland-china', category: 'restaurants', name: 'Chicken Fried Rice',        description: 'Egg-fried basmati with minced chicken.',                  priceInr: 381, mrpInr: 380, unit: 'Serves 1', isRegulated: false, accent: 'terracotta', glyph: 'sweet', isVeg: false },

  // Foodhall — premium grocery
  { vendor: 'foodhall', category: 'groceries', name: 'Extra Virgin Olive Oil',    description: 'Italian, cold-pressed. Peppery, grassy finish.',  priceInr: 651, mrpInr: 651, unit: '500ml',  isRegulated: true, accent: 'forest',    glyph: 'grain' },
  { vendor: 'foodhall', category: 'groceries', name: 'Artisanal Fusilli Pasta',    description: 'Bronze-die Italian pasta. Rough surface holds sauce.', priceInr: 451, mrpInr: 451, unit: '500g',  isRegulated: true, accent: 'saffron',   glyph: 'grain' },
  { vendor: 'foodhall', category: 'groceries', name: 'Dark Chocolate 75% Cacao',   description: 'Single-origin, low sugar.',                            priceInr: 301, mrpInr: 301, unit: '100g',   isRegulated: true, accent: 'terracotta', glyph: 'grain' },
  { vendor: 'foodhall', category: 'groceries', name: 'Sourdough Crackers',         description: 'Seeded sourdough crackers — tart, crunchy, shelf-stable.', priceInr: 281, mrpInr: 280, unit: '180g',   isRegulated: false, accent: 'saffron', glyph: 'grain' },
];

async function main() {
  console.log('🌱 Seeding Seasons Mall vendors, products + restoring hidden Seasons lines…\n');

  // 1. Categories
  for (const c of NEW_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: c,
      update: { name: c.name, glyph: c.glyph, order: c.order },
    });
  }
  console.log(`  ✓ ${NEW_CATEGORIES.length} new categories`);

  // 2. Vendors
  for (const v of NEW_VENDORS) {
    await prisma.vendor.upsert({
      where: { slug: v.slug },
      create: v,
      update: { name: v.name, hub: v.hub, description: v.description, accent: v.accent },
    });
  }
  console.log(`  ✓ ${NEW_VENDORS.length} new vendors`);

  // 3. Products
  let added = 0;
  let updated = 0;
  for (const p of NEW_PRODUCTS) {
    const vendor = await prisma.vendor.findUnique({ where: { slug: p.vendor } });
    const category = await prisma.category.findUnique({ where: { slug: p.category } });
    if (!vendor || !category) continue;

    const existing = await prisma.product.findFirst({
      where: { vendorId: vendor.id, name: p.name },
    });

    const data = {
      vendorId: vendor.id,
      categoryId: category.id,
      name: p.name,
      description: p.description,
      priceInr: p.priceInr,
      mrpInr: p.mrpInr,
      unit: p.unit,
      isVeg: p.isVeg ?? true,
      isRegulated: p.isRegulated ?? true,
      accent: p.accent,
      glyph: p.glyph,
      tagline: p.tagline,
      inStock: true,
    };

    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.product.create({ data });
      added++;
    }
  }
  console.log(`  ✓ ${added} new products added, ${updated} updated`);

  // 4. Restore previously-hidden Seasons lines (Starbucks + The Baker's Basket)
  const restored = await prisma.product.updateMany({
    where: { vendor: { slug: { in: ['starbucks', 'bakers'] } }, inStock: false },
    data: { inStock: true },
  });
  console.log(`  ✓ ${restored.count} previously-hidden Seasons items restored`);

  const [catCount, venCount, prodCount] = await Promise.all([
    prisma.category.count(),
    prisma.vendor.count(),
    prisma.product.count({ where: { inStock: true } }),
  ]);
  console.log(`\n✅ Catalog now: ${catCount} categories · ${venCount} vendors · ${prodCount} products in stock.`);
}

main()
  .catch((e) => {
    console.error('❌ Seasons seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
