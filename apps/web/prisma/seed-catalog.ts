import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: 'sweets-snacks',   name: 'Sweets & Snacks',   glyph: 'sweet',    order: 10 },
  { slug: 'produce',         name: 'Fresh Produce',     glyph: 'leaf',     order: 20 },
  { slug: 'dairy',           name: 'Dairy & Eggs',      glyph: 'drop',     order: 30 },
  { slug: 'groceries',       name: 'Pantry Staples',    glyph: 'grain',    order: 40 },
  { slug: 'bakery',          name: 'Bakery',            glyph: 'loaf',     order: 50 },
  { slug: 'meat',            name: 'Fresh Meat',        glyph: 'cut',      order: 60 },
  { slug: 'medicines',       name: 'Medicines',         glyph: 'pill',     order: 70 },
  { slug: 'beverages',       name: 'Beverages',         glyph: 'cup',      order: 80 },
  { slug: 'essentials',      name: 'Daily Essentials',  glyph: 'box',      order: 90 },
] as const;

const VENDORS = [
  { slug: 'kalika',       name: 'Kalika Sweets',          hub: 'Magarpatta Market',        accent: 'saffron',    description: 'Fresh-from-the-kadhai sweets and snacks. Institutional Magarpatta since 1998.' },
  { slug: 'dc',           name: 'Destination Centre',     hub: 'Destination Centre',       accent: 'forest',     description: 'The township\'s flagship grocery + supermarket. Everything, one aisle away.' },
  { slug: 'shraddha',     name: 'Shraddha Meats',         hub: 'Magarpatta Market',        accent: 'terracotta', description: 'Cut-to-order fresh meat. Halal and jhatka clearly labelled. Chill chain maintained.' },
  { slug: 'mg-pharmacy',  name: 'Magarpatta Pharmacy',    hub: 'Magarpatta',               accent: 'forest',     description: 'Registered pharmacist on site. Prescription refills handled with care.' },
  { slug: 'bakers',       name: 'The Baker\'s Basket',    hub: 'Seasons Mall',             accent: 'saffron',    description: 'Sourdough, croissants, seasonal loaves. Still-warm deliveries every morning.' },
  { slug: 'starbucks',    name: 'Starbucks · Seasons',    hub: 'Seasons Mall',             accent: 'forest',     description: 'Coffee from the counter to your door in under 20 minutes.' },
] as const;

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

// price rules:
//   isRegulated=true  → priceInr == mrpInr (we sell at MRP, recover via delivery fee)
//   isRegulated=false → non-MRP (loose/prepared). priceInr = base + ₹1 hyper-local markup.
const PRODUCTS: ProductSeed[] = [
  // Kalika Sweets — non-regulated, +₹1
  { vendor: 'kalika', category: 'sweets-snacks', name: 'Hot Jalebi',        description: 'Fresh out of the kadhai. Best within the hour.', priceInr: 121, mrpInr: 120, unit: '200g',    isRegulated: false, accent: 'saffron',    glyph: 'sweet',   tagline: 'Kadhai-fresh' },
  { vendor: 'kalika', category: 'sweets-snacks', name: 'Samosa',            description: 'Flaky pastry, potato-pea filling. Served with chutney.', priceInr: 41,  mrpInr: 40,  unit: '2 pcs',   isRegulated: false, accent: 'terracotta', glyph: 'sweet' },
  { vendor: 'kalika', category: 'sweets-snacks', name: 'Kaju Katli',        description: 'Silver-leaf cashew fudge. Sliced fresh.',                 priceInr: 451, mrpInr: 450, unit: '200g',    isRegulated: false, accent: 'saffron',    glyph: 'sweet' },
  { vendor: 'kalika', category: 'sweets-snacks', name: 'Gulab Jamun',       description: 'Rose-cardamom syrup. Warmed on arrival.',                  priceInr: 201, mrpInr: 200, unit: '250g',    isRegulated: false, accent: 'saffron',    glyph: 'sweet' },
  { vendor: 'kalika', category: 'sweets-snacks', name: 'Sev Batata Puri',   description: 'Assembled on your doorstep to avoid sogginess.',           priceInr: 101, mrpInr: 100, unit: '1 plate', isRegulated: false, accent: 'terracotta', glyph: 'sweet' },
  { vendor: 'kalika', category: 'sweets-snacks', name: 'Kachori',           description: 'Moong dal kachori, crisp and aromatic.',                   priceInr: 61,  mrpInr: 60,  unit: '2 pcs',   isRegulated: false, accent: 'saffron',    glyph: 'sweet' },
  { vendor: 'kalika', category: 'sweets-snacks', name: 'Malai Sandwich',    description: 'Chilled milk-cream delicacy.',                             priceInr: 81,  mrpInr: 80,  unit: '2 pcs',   isRegulated: false, accent: 'saffron',    glyph: 'sweet' },

  // Destination Centre — dairy
  { vendor: 'dc', category: 'dairy', name: 'Amul Gold Milk',          description: 'Full-cream, packed today.',               priceInr: 32,  mrpInr: 32,  unit: '500ml',    isRegulated: true,  accent: 'forest', glyph: 'drop' },
  { vendor: 'dc', category: 'dairy', name: 'Amul Butter Salted',      description: 'Pasteurised creamery butter.',             priceInr: 62,  mrpInr: 62,  unit: '100g',     isRegulated: true,  accent: 'saffron', glyph: 'drop' },
  { vendor: 'dc', category: 'dairy', name: 'Brown Eggs (Free-range)', description: 'Locally sourced, refrigerated.',           priceInr: 86,  mrpInr: 85,  unit: '6 pcs',    isRegulated: false, accent: 'terracotta', glyph: 'drop', isVeg: false },
  { vendor: 'dc', category: 'dairy', name: 'Mother Dairy Dahi',       description: 'Fresh set curd. Sweetness-free.',          priceInr: 45,  mrpInr: 45,  unit: '400g',     isRegulated: true,  accent: 'forest', glyph: 'drop' },
  { vendor: 'dc', category: 'dairy', name: 'Paneer (Fresh Cut)',      description: 'Cut to order from the counter block.',     priceInr: 91,  mrpInr: 90,  unit: '200g',     isRegulated: false, accent: 'saffron', glyph: 'drop' },

  // Destination Centre — produce (loose, +₹1)
  { vendor: 'dc', category: 'produce', name: 'Alphonso Mangoes',       description: 'Ratnagiri crop, hand-picked. Ripens in 2 days.', priceInr: 481, mrpInr: 480, unit: '1 dozen',  isRegulated: false, accent: 'saffron', glyph: 'leaf', tagline: 'Seasonal' },
  { vendor: 'dc', category: 'produce', name: 'Onions',                 description: 'Nashik-grade. Firm and pink.',                   priceInr: 41,  mrpInr: 40,  unit: '1 kg',     isRegulated: false, accent: 'terracotta', glyph: 'leaf' },
  { vendor: 'dc', category: 'produce', name: 'Potatoes',               description: 'UP new-crop. Smooth-skinned.',                    priceInr: 31,  mrpInr: 30,  unit: '1 kg',     isRegulated: false, accent: 'forest', glyph: 'leaf' },
  { vendor: 'dc', category: 'produce', name: 'Tomatoes',               description: 'Local, hybrid. Good for curries.',                priceInr: 26,  mrpInr: 25,  unit: '500g',     isRegulated: false, accent: 'terracotta', glyph: 'leaf' },
  { vendor: 'dc', category: 'produce', name: 'Baby Spinach',           description: 'Washed + trimmed. Ready-to-cook.',                priceInr: 56,  mrpInr: 55,  unit: '250g',     isRegulated: false, accent: 'forest', glyph: 'leaf' },
  { vendor: 'dc', category: 'produce', name: 'Green Chillies',         description: 'Medium-hot. Farm pick.',                          priceInr: 15,  mrpInr: 14,  unit: '100g',     isRegulated: false, accent: 'forest', glyph: 'leaf' },

  // Destination Centre — groceries (regulated MRP)
  { vendor: 'dc', category: 'groceries', name: 'Aashirvaad Atta',          description: 'Multigrain whole-wheat.',                       priceInr: 275, mrpInr: 275, unit: '5 kg',    isRegulated: true, accent: 'saffron', glyph: 'grain' },
  { vendor: 'dc', category: 'groceries', name: 'Tata Salt',                description: 'Iodised. Everyday essential.',                   priceInr: 28,  mrpInr: 28,  unit: '1 kg',    isRegulated: true, accent: 'forest', glyph: 'grain' },
  { vendor: 'dc', category: 'groceries', name: 'MDH Garam Masala',          description: 'Whole-spice blend. Fresh-ground.',                priceInr: 95,  mrpInr: 95,  unit: '100g',    isRegulated: true, accent: 'terracotta', glyph: 'grain' },
  { vendor: 'dc', category: 'groceries', name: 'Kissan Mixed Fruit Jam',    description: 'No preservatives. Kids\' breakfast staple.',      priceInr: 220, mrpInr: 220, unit: '500g',    isRegulated: true, accent: 'saffron', glyph: 'grain' },
  { vendor: 'dc', category: 'groceries', name: 'Fortune Sunflower Oil',     description: 'Refined. Pet bottle.',                            priceInr: 210, mrpInr: 210, unit: '1 L',     isRegulated: true, accent: 'saffron', glyph: 'grain' },
  { vendor: 'dc', category: 'groceries', name: 'Tata Tea Gold',             description: 'Signature blend. Assam-heavy.',                   priceInr: 285, mrpInr: 285, unit: '500g',    isRegulated: true, accent: 'terracotta', glyph: 'grain' },

  // Destination Centre — essentials (regulated MRP)
  { vendor: 'dc', category: 'essentials', name: 'Dettol Original Soap',     description: 'Antiseptic bar. Pack of 3.',                      priceInr: 120, mrpInr: 120, unit: '3 × 75g', isRegulated: true, accent: 'forest', glyph: 'box' },
  { vendor: 'dc', category: 'essentials', name: 'Surf Excel Quick Wash',    description: 'Front-load + top-load compatible.',               priceInr: 180, mrpInr: 180, unit: '1 kg',    isRegulated: true, accent: 'forest', glyph: 'box' },
  { vendor: 'dc', category: 'essentials', name: 'Colgate MaxFresh',         description: 'Mint-chill toothpaste.',                          priceInr: 95,  mrpInr: 95,  unit: '150g',    isRegulated: true, accent: 'forest', glyph: 'box' },
  { vendor: 'dc', category: 'essentials', name: 'Maggi Noodles Multipack',  description: '2-min masala. Pack of 4.',                        priceInr: 56,  mrpInr: 56,  unit: '4 × 70g', isRegulated: true, accent: 'saffron', glyph: 'box' },
  { vendor: 'dc', category: 'essentials', name: 'Harpic Bathroom Cleaner',  description: 'Limescale-dissolving.',                           priceInr: 110, mrpInr: 110, unit: '500ml',   isRegulated: true, accent: 'terracotta', glyph: 'box' },

  // Shraddha Meats — non-regulated, cut-to-order +₹1
  { vendor: 'shraddha', category: 'meat', name: 'Chicken Breast (Boneless)', description: 'Skinless, boneless. Cut to order.',  priceInr: 221, mrpInr: 220, unit: '500g', isRegulated: false, accent: 'terracotta', glyph: 'cut', isVeg: false },
  { vendor: 'shraddha', category: 'meat', name: 'Chicken Thigh (Bone-in)',   description: 'Rich-flavoured. Ideal for curries.',   priceInr: 181, mrpInr: 180, unit: '500g', isRegulated: false, accent: 'terracotta', glyph: 'cut', isVeg: false },
  { vendor: 'shraddha', category: 'meat', name: 'Chicken Keema',             description: 'Minced fresh. No preservatives.',      priceInr: 201, mrpInr: 200, unit: '500g', isRegulated: false, accent: 'terracotta', glyph: 'cut', isVeg: false },
  { vendor: 'shraddha', category: 'meat', name: 'Mutton Curry Cut',          description: 'Goat meat, bone-in. Fresh daily.',     priceInr: 401, mrpInr: 400, unit: '500g', isRegulated: false, accent: 'terracotta', glyph: 'cut', isVeg: false },
  { vendor: 'shraddha', category: 'meat', name: 'Rohu Fish (Cleaned)',       description: 'Scaled and gutted. River-fresh.',      priceInr: 301, mrpInr: 300, unit: '500g', isRegulated: false, accent: 'forest', glyph: 'cut', isVeg: false },

  // Magarpatta Pharmacy — regulated MRP
  { vendor: 'mg-pharmacy', category: 'medicines', name: 'Crocin 500 Advance',      description: 'Paracetamol. Fast-relief fever/pain.', priceInr: 22,  mrpInr: 22,  unit: '15 tablets', isRegulated: true, accent: 'forest', glyph: 'pill' },
  { vendor: 'mg-pharmacy', category: 'medicines', name: 'Paracetamol 650mg',       description: 'Generic paracetamol.',                  priceInr: 35,  mrpInr: 35,  unit: '15 tablets', isRegulated: true, accent: 'forest', glyph: 'pill' },
  { vendor: 'mg-pharmacy', category: 'medicines', name: 'Vicks VapoRub',           description: 'Menthol chest-rub.',                    priceInr: 75,  mrpInr: 75,  unit: '25ml',       isRegulated: true, accent: 'saffron', glyph: 'pill' },
  { vendor: 'mg-pharmacy', category: 'medicines', name: 'Dettol Handwash Refill',  description: 'Anti-bacterial liquid soap.',            priceInr: 99,  mrpInr: 99,  unit: '200ml',      isRegulated: true, accent: 'terracotta', glyph: 'pill' },
  { vendor: 'mg-pharmacy', category: 'medicines', name: 'ORS Rehydration Sachet',  description: 'Electrolyte replacement. 5 sachets.',    priceInr: 100, mrpInr: 100, unit: '5 sachets',  isRegulated: true, accent: 'forest', glyph: 'pill' },
  { vendor: 'mg-pharmacy', category: 'medicines', name: 'Strepsils Menthol',       description: 'Throat lozenges.',                       priceInr: 60,  mrpInr: 60,  unit: '8 lozenges', isRegulated: true, accent: 'terracotta', glyph: 'pill' },

  // Baker's Basket — non-regulated prepared +₹1
  { vendor: 'bakers', category: 'bakery', name: 'Sourdough Loaf',        description: 'Slow-fermented 24h. Still warm on delivery.', priceInr: 221, mrpInr: 220, unit: '500g',   isRegulated: false, accent: 'saffron', glyph: 'loaf', tagline: 'Still warm' },
  { vendor: 'bakers', category: 'bakery', name: 'Almond Croissant',      description: 'French-butter, slivered almonds.',            priceInr: 121, mrpInr: 120, unit: '1 pc',   isRegulated: false, accent: 'saffron', glyph: 'loaf' },
  { vendor: 'bakers', category: 'bakery', name: 'Chocolate Cookies',     description: 'Dark chocolate chunks. Chewy.',               priceInr: 181, mrpInr: 180, unit: 'Box of 6', isRegulated: false, accent: 'terracotta', glyph: 'loaf' },
  { vendor: 'bakers', category: 'bakery', name: 'Banana Bread Loaf',     description: 'Walnuts, over-ripe bananas, sugar-light.',    priceInr: 151, mrpInr: 150, unit: '1 loaf', isRegulated: false, accent: 'saffron', glyph: 'loaf' },

  // Starbucks — non-regulated prepared +₹1
  { vendor: 'starbucks', category: 'beverages', name: 'Tall Cappuccino',        description: 'Espresso, foamed milk, pinch of cocoa.',       priceInr: 226, mrpInr: 225, unit: '354ml',  isRegulated: false, accent: 'forest', glyph: 'cup' },
  { vendor: 'starbucks', category: 'beverages', name: 'Cold Brew',              description: 'Steeped 20 hours. Bold, low-acid.',            priceInr: 281, mrpInr: 280, unit: '473ml',  isRegulated: false, accent: 'forest', glyph: 'cup' },
  { vendor: 'starbucks', category: 'beverages', name: 'Caramel Macchiato',      description: 'Vanilla-sweetened espresso + caramel drizzle.', priceInr: 301, mrpInr: 300, unit: '354ml',  isRegulated: false, accent: 'saffron', glyph: 'cup' },
  { vendor: 'starbucks', category: 'beverages', name: 'Blueberry Muffin',       description: 'Baked in-store each morning.',                  priceInr: 151, mrpInr: 150, unit: '1 pc',   isRegulated: false, accent: 'saffron', glyph: 'cup' },
];

async function main() {
  console.log('🌱 Seeding catalog…');

  // Categories
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: c,
      update: { name: c.name, glyph: c.glyph, order: c.order },
    });
  }
  console.log(`  ✓ ${CATEGORIES.length} categories`);

  // Vendors
  for (const v of VENDORS) {
    await prisma.vendor.upsert({
      where: { slug: v.slug },
      create: v,
      update: { name: v.name, hub: v.hub, description: v.description, accent: v.accent },
    });
  }
  console.log(`  ✓ ${VENDORS.length} vendors`);

  // Products
  for (const p of PRODUCTS) {
    const vendor = await prisma.vendor.findUnique({ where: { slug: p.vendor } });
    const category = await prisma.category.findUnique({ where: { slug: p.category } });
    if (!vendor || !category) {
      console.warn(`  ⚠️  skipped ${p.name} (vendor=${p.vendor} category=${p.category})`);
      continue;
    }

    // Composite natural key: vendor+name
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
    };

    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
    } else {
      await prisma.product.create({ data });
    }
  }
  console.log(`  ✓ ${PRODUCTS.length} products`);

  const [catCount, venCount, prodCount] = await Promise.all([
    prisma.category.count(),
    prisma.vendor.count(),
    prisma.product.count(),
  ]);
  console.log(`\n✅ Catalog seeded: ${catCount} categories, ${venCount} vendors, ${prodCount} products.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
