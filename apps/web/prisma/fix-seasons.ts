import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fictional / wrong Seasons Mall vendors from earlier seed. Remove entirely
// (cascades to their products). Also removes Baker's Basket — unconfirmed.
const REMOVE_VENDOR_SLUGS = ['theobroma', 'blue-tokai', 'mainland-china', 'foodhall', 'bakers'];

// Confirmed Seasons Mall tenants per Zomato / LBB / mall directory, 2026.
// Starbucks · Seasons already exists in the DB from an earlier seed; we don't
// recreate it here, we only add the three new ones.
const NEW_VENDORS = [
  {
    slug: 'mcdonalds',
    name: "McDonald's · Seasons",
    hub: 'Seasons Mall',
    accent: 'saffron',
    description: 'Burgers, fries, McFlurry. Global quick-service at Seasons Mall, Magarpatta.',
  },
  {
    slug: 'cbtl',
    name: 'Coffee Bean & Tea Leaf · Seasons',
    hub: 'Seasons Mall',
    accent: 'forest',
    description: 'Classic espresso, chai, blended iced drinks. First-floor café.',
  },
  {
    slug: 'malaka-spice',
    name: 'Malaka Spice · Seasons',
    hub: 'Seasons Mall',
    accent: 'terracotta',
    description: 'Pune-native pan-Asian kitchen — Thai curries, Malay classics, wok-fired noodles.',
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
  // McDonald's
  { vendor: 'mcdonalds', category: 'restaurants', name: 'McSpicy Chicken Burger', description: 'Crispy chicken fillet, spicy mayo, iceberg lettuce.', priceInr: 181, mrpInr: 180, unit: '1 pc',      isRegulated: false, accent: 'saffron', glyph: 'sweet', isVeg: false },
  { vendor: 'mcdonalds', category: 'restaurants', name: 'Big Mac',                  description: 'Twin beef patty, three-tier bun, special sauce.',     priceInr: 251, mrpInr: 250, unit: '1 pc',      isRegulated: false, accent: 'terracotta', glyph: 'sweet', isVeg: false },
  { vendor: 'mcdonalds', category: 'restaurants', name: 'McAloo Tikki Burger',      description: 'Spiced potato patty, sweet onion, mayo.',              priceInr: 61,  mrpInr: 60,  unit: '1 pc',      isRegulated: false, accent: 'saffron', glyph: 'sweet' },
  { vendor: 'mcdonalds', category: 'restaurants', name: 'World Famous Fries',       description: 'Large portion, salted.',                                priceInr: 131, mrpInr: 130, unit: 'Large',     isRegulated: false, accent: 'saffron', glyph: 'sweet' },

  // Coffee Bean & Tea Leaf
  { vendor: 'cbtl', category: 'beverages',   name: 'Classic Cappuccino',         description: 'Double espresso with velvet-steamed milk.',             priceInr: 241, mrpInr: 240, unit: '354ml',   isRegulated: false, accent: 'forest',    glyph: 'cup' },
  { vendor: 'cbtl', category: 'beverages',   name: 'Mocha Ice Blended',          description: 'Chocolate + espresso, blended over ice. CBTL signature.', priceInr: 321, mrpInr: 320, unit: '473ml',  isRegulated: false, accent: 'terracotta', glyph: 'cup' },
  { vendor: 'cbtl', category: 'beverages',   name: 'Vanilla Earl Grey Tea',      description: 'Black tea, bergamot, vanilla notes.',                    priceInr: 221, mrpInr: 220, unit: '354ml',  isRegulated: false, accent: 'forest',    glyph: 'cup' },
  { vendor: 'cbtl', category: 'beverages',   name: 'Blueberry Muffin',           description: 'Baked in-house, warmed on request.',                     priceInr: 151, mrpInr: 150, unit: '1 pc',   isRegulated: false, accent: 'saffron',   glyph: 'cup' },

  // Malaka Spice
  { vendor: 'malaka-spice', category: 'restaurants', name: 'Thai Red Curry (Veg)',      description: 'Coconut curry, Thai basil, bamboo shoots, red chillies.', priceInr: 421, mrpInr: 420, unit: 'Serves 2', isRegulated: false, accent: 'terracotta', glyph: 'sweet' },
  { vendor: 'malaka-spice', category: 'restaurants', name: 'Chicken Satay Skewers',     description: 'Grilled marinated chicken, peanut dipping sauce.',       priceInr: 381, mrpInr: 380, unit: '6 pcs',    isRegulated: false, accent: 'terracotta', glyph: 'sweet', isVeg: false },
  { vendor: 'malaka-spice', category: 'restaurants', name: 'Pad Thai Noodles',          description: 'Rice noodles, tamarind, peanuts, scrambled egg.',        priceInr: 441, mrpInr: 440, unit: 'Serves 1', isRegulated: false, accent: 'saffron',    glyph: 'sweet' },
  { vendor: 'malaka-spice', category: 'restaurants', name: 'Mango Sticky Rice',         description: 'Steamed glutinous rice, fresh mango, coconut cream.',    priceInr: 281, mrpInr: 280, unit: 'Serves 1', isRegulated: false, accent: 'saffron',    glyph: 'sweet' },
];

async function main() {
  console.log('🔧 Fixing Seasons Mall catalog…\n');

  // 1. Remove fictional vendors (cascades to their products)
  const removed = await prisma.vendor.deleteMany({
    where: { slug: { in: REMOVE_VENDOR_SLUGS } },
  });
  console.log(`  ✂  Removed ${removed.count} vendors (Theobroma, Blue Tokai, Mainland China, Foodhall, Baker's Basket) and their products`);

  // 2. Add real Seasons vendors
  for (const v of NEW_VENDORS) {
    await prisma.vendor.upsert({
      where: { slug: v.slug },
      create: v,
      update: { name: v.name, hub: v.hub, description: v.description, accent: v.accent },
    });
  }
  console.log(`  ✓ ${NEW_VENDORS.length} new vendors added (McDonald's, Coffee Bean & Tea Leaf, Malaka Spice)`);

  // 3. Add their products
  let added = 0;
  for (const p of NEW_PRODUCTS) {
    const vendor = await prisma.vendor.findUnique({ where: { slug: p.vendor } });
    const category = await prisma.category.findUnique({ where: { slug: p.category } });
    if (!vendor || !category) continue;

    const existing = await prisma.product.findFirst({ where: { vendorId: vendor.id, name: p.name } });
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
    } else {
      await prisma.product.create({ data });
      added++;
    }
  }
  console.log(`  ✓ ${added} products added across the new vendors`);

  const [catCount, venCount, prodCount] = await Promise.all([
    prisma.category.count(),
    prisma.vendor.count(),
    prisma.product.count({ where: { inStock: true } }),
  ]);
  console.log(`\n✅ Catalog now: ${catCount} categories · ${venCount} vendors · ${prodCount} products in stock.`);
}

main()
  .catch((e) => {
    console.error('❌ Fix failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
