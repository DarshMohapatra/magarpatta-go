import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Catalog corrections v2…\n');

  // 1. Remove Malaka Spice (not at Seasons Mall)
  const removed = await prisma.vendor.deleteMany({ where: { slug: 'malaka-spice' } });
  console.log(`  ✂  Removed Malaka Spice vendor (${removed.count}) and its products`);

  // 2. Re-add Theobroma — adjacent to Magarpatta (Amanora / Kharadi area), not inside Seasons
  const theobroma = await prisma.vendor.upsert({
    where: { slug: 'theobroma' },
    create: {
      slug: 'theobroma',
      name: 'Theobroma',
      hub: 'Amanora · adjacent to Magarpatta',
      accent: 'terracotta',
      description: 'Brownies, patisserie, laminated breads. A Mumbai-native bakery with a Magarpatta-adjacent outlet.',
    },
    update: {
      name: 'Theobroma',
      hub: 'Amanora · adjacent to Magarpatta',
      accent: 'terracotta',
      description: 'Brownies, patisserie, laminated breads. A Mumbai-native bakery with a Magarpatta-adjacent outlet.',
    },
  });
  console.log(`  ✓ Theobroma vendor restored (hub: Amanora / adjacent to Magarpatta)`);

  // 3. Add Pop Tate's — real Seasons Mall restaurant
  const popTates = await prisma.vendor.upsert({
    where: { slug: 'pop-tates' },
    create: {
      slug: 'pop-tates',
      name: "Pop Tate's · Seasons",
      hub: 'Seasons Mall',
      accent: 'saffron',
      description: 'Casual American-Italian diner — pizzas, burgers, pastas, sizzlers.',
    },
    update: {
      name: "Pop Tate's · Seasons",
      hub: 'Seasons Mall',
      accent: 'saffron',
      description: 'Casual American-Italian diner — pizzas, burgers, pastas, sizzlers.',
    },
  });
  console.log(`  ✓ Pop Tate's · Seasons added`);

  const bakery = await prisma.category.findUnique({ where: { slug: 'bakery' } });
  const restaurants = await prisma.category.findUnique({ where: { slug: 'restaurants' } });
  const beverages = await prisma.category.findUnique({ where: { slug: 'beverages' } });
  const starbucks = await prisma.vendor.findUnique({ where: { slug: 'starbucks' } });

  if (!bakery || !restaurants || !beverages || !starbucks) {
    throw new Error('Missing expected category/vendor from DB — re-run base seeds first');
  }

  // 4. Theobroma products (Bakery)
  const theobromaProducts = [
    { name: 'Chocolate Dutch Truffle Cake', description: 'Signature dark-chocolate layer cake with ganache.',   priceInr: 821, mrpInr: 820, unit: '500g',       accent: 'terracotta', glyph: 'loaf', tagline: 'Iconic',    isRegulated: false },
    { name: 'Theobroma Brownie Pack',        description: 'Warm, fudgy chocolate brownies. Four per box.',        priceInr: 421, mrpInr: 420, unit: 'Pack of 4',  accent: 'terracotta', glyph: 'loaf',                       isRegulated: false },
    { name: 'Butter Croissant',               description: 'Laminated all-butter croissant.',                      priceInr: 141, mrpInr: 140, unit: '1 pc',       accent: 'saffron',    glyph: 'loaf',                       isRegulated: false },
    { name: 'Red Velvet Pastry',              description: 'Cream-cheese frosting, single-serve pastry.',          priceInr: 171, mrpInr: 170, unit: '1 pc',       accent: 'terracotta', glyph: 'loaf',                       isRegulated: false },
  ];

  for (const p of theobromaProducts) {
    const existing = await prisma.product.findFirst({ where: { vendorId: theobroma.id, name: p.name } });
    const data = {
      vendorId: theobroma.id,
      categoryId: bakery.id,
      name: p.name,
      description: p.description,
      priceInr: p.priceInr,
      mrpInr: p.mrpInr,
      unit: p.unit,
      isVeg: true,
      isRegulated: p.isRegulated,
      accent: p.accent,
      glyph: p.glyph,
      tagline: p.tagline,
      inStock: true,
    };
    if (existing) await prisma.product.update({ where: { id: existing.id }, data });
    else await prisma.product.create({ data });
  }
  console.log(`  ✓ Theobroma · 4 bakery products`);

  // 5. Pop Tate's products (Restaurants)
  const popTatesProducts = [
    { name: 'Cheese Margherita Pizza',         description: 'Hand-tossed base, San Marzano tomato, fresh mozzarella.', priceInr: 391, mrpInr: 390, unit: '9"',        accent: 'saffron',   glyph: 'sweet',                     isVeg: true,  isRegulated: false },
    { name: 'BBQ Chicken Sizzler',             description: 'Grilled BBQ chicken, rice, fries, herbed veg — served hot.', priceInr: 491, mrpInr: 490, unit: 'Serves 1', accent: 'terracotta', glyph: 'sweet',                  isVeg: false, isRegulated: false },
    { name: 'Spaghetti Aglio e Olio',          description: 'Garlic, olive oil, chilli flakes, parmesan.',                 priceInr: 361, mrpInr: 360, unit: 'Serves 1', accent: 'saffron',   glyph: 'sweet',                     isVeg: true,  isRegulated: false },
    { name: 'Pop Tate\'s Classic Burger',      description: 'House beef patty, cheddar, lettuce, pickles, fries.',         priceInr: 341, mrpInr: 340, unit: '1 pc',     accent: 'terracotta', glyph: 'sweet',                  isVeg: false, isRegulated: false },
  ];

  for (const p of popTatesProducts) {
    const existing = await prisma.product.findFirst({ where: { vendorId: popTates.id, name: p.name } });
    const data = {
      vendorId: popTates.id,
      categoryId: restaurants.id,
      name: p.name,
      description: p.description,
      priceInr: p.priceInr,
      mrpInr: p.mrpInr,
      unit: p.unit,
      isVeg: p.isVeg,
      isRegulated: p.isRegulated,
      accent: p.accent,
      glyph: p.glyph,
      inStock: true,
    };
    if (existing) await prisma.product.update({ where: { id: existing.id }, data });
    else await prisma.product.create({ data });
  }
  console.log(`  ✓ Pop Tate's · 4 restaurant products`);

  // 6. Move Starbucks Blueberry Muffin to Bakery + add 2 more Starbucks bakery items
  const blueberry = await prisma.product.findFirst({
    where: { vendorId: starbucks.id, name: 'Blueberry Muffin' },
  });
  if (blueberry) {
    await prisma.product.update({ where: { id: blueberry.id }, data: { categoryId: bakery.id } });
    console.log(`  ✓ Moved Starbucks Blueberry Muffin to Bakery`);
  }

  const starbucksBakery = [
    { name: 'Starbucks Chocolate Chip Cookie', description: 'Chewy chocolate chunk cookie, baked fresh at the counter.',  priceInr: 181, mrpInr: 180, unit: '1 pc',  accent: 'terracotta', glyph: 'loaf', isRegulated: false },
    { name: 'Starbucks Butter Croissant',      description: 'Flaky laminated butter croissant.',                            priceInr: 161, mrpInr: 160, unit: '1 pc',  accent: 'saffron',    glyph: 'loaf', isRegulated: false },
  ];

  for (const p of starbucksBakery) {
    const existing = await prisma.product.findFirst({ where: { vendorId: starbucks.id, name: p.name } });
    const data = {
      vendorId: starbucks.id,
      categoryId: bakery.id,
      name: p.name,
      description: p.description,
      priceInr: p.priceInr,
      mrpInr: p.mrpInr,
      unit: p.unit,
      isVeg: true,
      isRegulated: p.isRegulated,
      accent: p.accent,
      glyph: p.glyph,
      inStock: true,
    };
    if (existing) await prisma.product.update({ where: { id: existing.id }, data });
    else await prisma.product.create({ data });
  }
  console.log(`  ✓ Starbucks · 2 new bakery products`);

  const [catCount, venCount, prodCount] = await Promise.all([
    prisma.category.count(),
    prisma.vendor.count(),
    prisma.product.count({ where: { inStock: true } }),
  ]);
  const bakeryCount = await prisma.product.count({ where: { inStock: true, categoryId: bakery.id } });
  const restaurantCount = await prisma.product.count({ where: { inStock: true, categoryId: restaurants.id } });
  console.log(`\n✅ Catalog now: ${catCount} categories · ${venCount} vendors · ${prodCount} products in stock.`);
  console.log(`    · Bakery: ${bakeryCount} items · Restaurants: ${restaurantCount} items`);
}

main()
  .catch((e) => {
    console.error('❌ Fix v2 failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
