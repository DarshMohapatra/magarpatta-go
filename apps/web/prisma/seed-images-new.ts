import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Wires images for Baker's Basket + Gulab Paan Corner items.
 * Uses vendor-slug + name lookup so it doesn't collide with other vendors
 * that may have similarly-named products (e.g. Theobroma's Butter Croissant).
 */
const MAPPINGS: Array<{ vendorSlug: string; name: string; url: string }> = [
  // Baker's Basket
  { vendorSlug: 'bakers',     name: 'Butter Croissant',    url: '/products/bakers-butter-croissant.jpg' },
  { vendorSlug: 'bakers',     name: 'Chocolate Croissant', url: '/products/bakers-chocolate-croissant.jpg' },
  { vendorSlug: 'bakers',     name: 'Cheese Danish',       url: '/products/bakers-cheese-danish.jpg' },
  { vendorSlug: 'bakers',     name: 'Multigrain Loaf',     url: '/products/bakers-multigrain-loaf.jpg' },
  { vendorSlug: 'bakers',     name: 'Red Velvet Slice',    url: '/products/bakers-red-velvet-slice.jpg' },
  { vendorSlug: 'bakers',     name: 'Tiramisu Cup',        url: '/products/bakers-tiramisu-cup.jpg' },
  { vendorSlug: 'bakers',     name: 'Garlic Focaccia',     url: '/products/bakers-garlic-focaccia.jpg' },
  { vendorSlug: 'bakers',     name: 'Plum Cake',           url: '/products/bakers-plum-cake.jpg' },
  { vendorSlug: 'bakers',     name: 'Cold Coffee',         url: '/products/bakers-cold-coffee.jpg' },
  { vendorSlug: 'bakers',     name: 'Masala Chai',         url: '/products/bakers-masala-chai.jpg' },

  // Gulab Paan Corner (concierge-only)
  { vendorSlug: 'gulab-paan', name: 'Classic Meetha Paan', url: '/products/paan-classic-meetha.jpg' },
  { vendorSlug: 'gulab-paan', name: 'Chocolate Paan',      url: '/products/paan-chocolate.jpg' },
  { vendorSlug: 'gulab-paan', name: 'Banarasi Paan',       url: '/products/paan-banarasi.jpg' },
];

async function main() {
  console.log('🖼️  Wiring new product images (vendor-aware)…\n');
  let updated = 0;
  let missing = 0;
  for (const m of MAPPINGS) {
    const vendor = await prisma.vendor.findUnique({ where: { slug: m.vendorSlug } });
    if (!vendor) {
      console.warn(`  ⚠️  vendor missing: ${m.vendorSlug}`);
      missing++;
      continue;
    }
    const product = await prisma.product.findFirst({
      where: { vendorId: vendor.id, name: m.name },
    });
    if (!product) {
      console.warn(`  ⚠️  product missing: ${m.vendorSlug} / ${m.name}`);
      missing++;
      continue;
    }
    await prisma.product.update({ where: { id: product.id }, data: { imageUrl: m.url } });
    console.log(`  ✓  ${m.vendorSlug.padEnd(12)} ${m.name.padEnd(28)} → ${m.url}`);
    updated++;
  }
  console.log(`\n✅ ${updated} wired · ${missing} missing.`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
