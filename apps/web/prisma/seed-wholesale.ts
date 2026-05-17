import { PrismaClient } from '@prisma/client';

/**
 * Trial-launch suppliers. Two wholesale vendors covering the wholesale
 * categories the platform is opening with — one fresh produce, one
 * eggs / meat / breads. Idempotent: re-running won't duplicate rows.
 */

const prisma = new PrismaClient();

const VENDORS = [
  {
    slug: 'magarpatta-mandi',
    name: 'Magarpatta Mandi',
    hub: 'Magarpatta',
    accent: 'forest',
    description: 'Fresh fruits and vegetables straight from Pune mandi. Prices update each morning after the wholesale auction.',
    vendorType: 'grocery',
    isWholesale: true,
    minOrderInr: 200,
    ownerName: 'Magarpatta Mandi Owner',
    ownerPhone: '9999900001',
    addressLine: 'Magarpatta City, Hadapsar, Pune',
    openTime: '07:00',
    closeTime: '20:00',
  },
  {
    slug: 'magarpatta-daily',
    name: 'Magarpatta Daily',
    hub: 'Magarpatta',
    accent: 'terracotta',
    description: 'Eggs, fresh meat and breads delivered the same day. Halal/jhatka clearly labelled, chill chain maintained.',
    vendorType: 'grocery',
    isWholesale: true,
    minOrderInr: 250,
    ownerName: 'Magarpatta Daily Owner',
    ownerPhone: '9999900002',
    addressLine: 'Magarpatta City, Hadapsar, Pune',
    openTime: '07:00',
    closeTime: '21:00',
  },
] as const;

interface ProductSeed {
  vendor: string;
  category: string;       // category slug
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
  imageUrl?: string | null;
}

// Existing images we can reuse from public/products/.
// Anything else falls back to the glyph icon (works fine visually).
const IMG = (filename: string | null) => filename ? `/products/${filename}` : null;

const PRODUCTS: ProductSeed[] = [
  // ───── Magarpatta Mandi · Fresh Produce ─────
  { vendor: 'magarpatta-mandi', category: 'produce', name: 'Onions',         description: 'Nashik-grade, firm pink. Wholesale-priced.', priceInr: 35, mrpInr: 35, unit: '1 kg',  isRegulated: false, accent: 'terracotta', glyph: 'leaf', imageUrl: IMG('onions.jpg') },
  { vendor: 'magarpatta-mandi', category: 'produce', name: 'Potatoes',       description: 'UP new-crop, smooth-skinned.',               priceInr: 28, mrpInr: 28, unit: '1 kg',  isRegulated: false, accent: 'forest',     glyph: 'leaf', imageUrl: IMG('potatoes.jpg') },
  { vendor: 'magarpatta-mandi', category: 'produce', name: 'Tomatoes',       description: 'Local hybrid, curry-grade. Picked today.',   priceInr: 24, mrpInr: 24, unit: '1 kg',  isRegulated: false, accent: 'terracotta', glyph: 'leaf', imageUrl: IMG('tomatoes.jpg') },
  { vendor: 'magarpatta-mandi', category: 'produce', name: 'Green Chillies', description: 'Medium-hot. Farm pick this morning.',        priceInr: 12, mrpInr: 12, unit: '100g',  isRegulated: false, accent: 'forest',     glyph: 'leaf', imageUrl: IMG('green-chillies.jpg') },
  { vendor: 'magarpatta-mandi', category: 'produce', name: 'Coriander',      description: 'Bundle, washed and trimmed.',                priceInr: 18, mrpInr: 18, unit: '100g',  isRegulated: false, accent: 'forest',     glyph: 'leaf', imageUrl: IMG('coriander.jpg') },
  { vendor: 'magarpatta-mandi', category: 'produce', name: 'Baby Spinach',   description: 'Washed + ready to cook.',                     priceInr: 48, mrpInr: 48, unit: '250g',  isRegulated: false, accent: 'forest',     glyph: 'leaf', imageUrl: IMG('baby-spinach.jpg') },
  { vendor: 'magarpatta-mandi', category: 'produce', name: 'Capsicum',       description: 'Green bell pepper, glossy skin.',             priceInr: 55, mrpInr: 55, unit: '500g',  isRegulated: false, accent: 'forest',     glyph: 'leaf', imageUrl: IMG('capsicum.jpg') },
  { vendor: 'magarpatta-mandi', category: 'produce', name: 'Lemons',         description: 'Juicy, thin-skinned.',                        priceInr: 32, mrpInr: 32, unit: '500g',  isRegulated: false, accent: 'saffron',    glyph: 'leaf', imageUrl: IMG('lemons.jpg') },
  { vendor: 'magarpatta-mandi', category: 'produce', name: 'Bananas',        description: 'Robusta, table-ripe.',                        priceInr: 58, mrpInr: 58, unit: '1 dozen', isRegulated: false, accent: 'saffron',   glyph: 'leaf', imageUrl: IMG('bananas.jpg') },
  { vendor: 'magarpatta-mandi', category: 'produce', name: 'Apples',         description: 'Shimla-Royal-Delicious.',                     priceInr: 165, mrpInr: 165, unit: '1 kg', isRegulated: false, accent: 'terracotta', glyph: 'leaf', imageUrl: IMG('apples.jpg') },
  { vendor: 'magarpatta-mandi', category: 'produce', name: 'Watermelon',     description: 'Whole, ~3 kg. Knife-test cut on request.',    priceInr: 95, mrpInr: 95, unit: '1 whole', isRegulated: false, accent: 'forest',   glyph: 'leaf', imageUrl: IMG('watermelon.jpg') },
  { vendor: 'magarpatta-mandi', category: 'produce', name: 'Pomegranate',    description: 'Maharashtra-Bhagwa, sweet seed.',             priceInr: 145, mrpInr: 145, unit: '1 kg', isRegulated: false, accent: 'terracotta', glyph: 'leaf', imageUrl: IMG('pomegranate.jpg') },

  // ───── Magarpatta Daily · Eggs ─────
  { vendor: 'magarpatta-daily', category: 'dairy', name: 'Brown Eggs (Tray)',      description: 'Free-range, refrigerated. Tray of 30.', priceInr: 285, mrpInr: 285, unit: '30 pcs', isRegulated: false, accent: 'terracotta', glyph: 'drop', isVeg: false, imageUrl: IMG('brown-eggs-tray.jpg') },
  { vendor: 'magarpatta-daily', category: 'dairy', name: 'White Eggs (Half-dozen)', description: 'Standard-grade, refrigerated.',         priceInr: 60,  mrpInr: 60,  unit: '6 pcs',  isRegulated: false, accent: 'forest',     glyph: 'drop', isVeg: false, imageUrl: IMG('white-eggs.jpg') },

  // ───── Magarpatta Daily · Meat ─────
  { vendor: 'magarpatta-daily', category: 'meat', name: 'Chicken Breast (Boneless)', description: 'Skinless, boneless. Cut to order.',  priceInr: 210, mrpInr: 210, unit: '500g', isRegulated: false, accent: 'terracotta', glyph: 'cut', isVeg: false, imageUrl: IMG('chicken-breast.jpg') },
  { vendor: 'magarpatta-daily', category: 'meat', name: 'Chicken Thigh (Bone-in)',   description: 'Rich-flavoured. Curry-cut.',          priceInr: 170, mrpInr: 170, unit: '500g', isRegulated: false, accent: 'terracotta', glyph: 'cut', isVeg: false, imageUrl: IMG('chicken-thigh.jpg') },
  { vendor: 'magarpatta-daily', category: 'meat', name: 'Chicken Keema',             description: 'Minced fresh. No preservatives.',     priceInr: 195, mrpInr: 195, unit: '500g', isRegulated: false, accent: 'terracotta', glyph: 'cut', isVeg: false, imageUrl: IMG('chicken-keema.jpg') },
  { vendor: 'magarpatta-daily', category: 'meat', name: 'Mutton Curry Cut',          description: 'Goat meat, bone-in. Cleaned.',         priceInr: 395, mrpInr: 395, unit: '500g', isRegulated: false, accent: 'terracotta', glyph: 'cut', isVeg: false, imageUrl: IMG('mutton-curry.jpg') },

  // ───── Magarpatta Daily · Bakery ─────
  { vendor: 'magarpatta-daily', category: 'bakery', name: 'Whole-Wheat Bread Loaf', description: 'Baked at 4 AM. No preservatives.',     priceInr: 55, mrpInr: 55, unit: '400g', isRegulated: false, accent: 'saffron', glyph: 'loaf', imageUrl: IMG('whole-wheat-loaf.jpg') },
  { vendor: 'magarpatta-daily', category: 'bakery', name: 'Pav (Bread Rolls)',      description: 'Soft Mumbai-style pav. Pack of 8.',     priceInr: 40, mrpInr: 40, unit: '8 pcs',  isRegulated: false, accent: 'saffron', glyph: 'loaf', imageUrl: IMG('pav.jpg') },
  { vendor: 'magarpatta-daily', category: 'bakery', name: 'Multigrain Bread Loaf',  description: 'Five grains, seeded crust.',            priceInr: 95, mrpInr: 95, unit: '400g', isRegulated: false, accent: 'saffron', glyph: 'loaf', imageUrl: IMG('bakers-multigrain-loaf.jpg') },
];

async function ensureWholesale() {
  console.log('🌱 Seeding wholesale vendors (Magarpatta Mandi + Magarpatta Daily)…');

  for (const v of VENDORS) {
    await prisma.vendor.upsert({
      where: { slug: v.slug },
      create: { ...v, approvalStatus: 'APPROVED' },
      update: {
        name: v.name,
        hub: v.hub,
        accent: v.accent,
        description: v.description,
        isWholesale: v.isWholesale,
        minOrderInr: v.minOrderInr,
        ownerName: v.ownerName,
        ownerPhone: v.ownerPhone,
        addressLine: v.addressLine,
        openTime: v.openTime,
        closeTime: v.closeTime,
      },
    });
    console.log(`  ✓ ${v.name} (min ₹${v.minOrderInr})`);
  }

  let added = 0;
  let updated = 0;
  for (const p of PRODUCTS) {
    const vendor = await prisma.vendor.findUnique({ where: { slug: p.vendor } });
    const category = await prisma.category.findUnique({ where: { slug: p.category } });
    if (!vendor || !category) {
      console.warn(`  ⚠️  skipped ${p.name} (vendor=${p.vendor} category=${p.category})`);
      continue;
    }
    const existing = await prisma.product.findFirst({ where: { vendorId: vendor.id, name: p.name } });
    const data = {
      vendorId: vendor.id,
      categoryId: category.id,
      name: p.name,
      description: p.description ?? null,
      priceInr: p.priceInr,
      mrpInr: p.mrpInr,
      unit: p.unit ?? null,
      isVeg: p.isVeg ?? true,
      isRegulated: p.isRegulated ?? true,
      accent: p.accent ?? null,
      glyph: p.glyph ?? null,
      tagline: p.tagline ?? null,
      imageUrl: p.imageUrl ?? null,
    };
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.product.create({ data });
      added++;
    }
  }
  console.log(`  ✓ products: ${added} new, ${updated} refreshed`);
}

// Allow this file to be run standalone OR imported by seed.ts.
export { ensureWholesale };

if (require.main === module) {
  ensureWholesale()
    .catch((e) => { console.error('❌ wholesale seed failed:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
}
