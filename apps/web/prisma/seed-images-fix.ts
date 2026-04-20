import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Manual override — specific Wikimedia Commons URLs verified to show the
// correct subject. When the REST API picked a wrong article's lead image,
// this script replaces it with a known-good direct file URL.
//
// A value of null means "clear the image URL" so the ProductCard falls back
// to the styled glyph (better than a confidently wrong image).
const OVERRIDES: Record<string, string | null> = {
  // Butter: the Wikipedia 'Butter' article image changed; use a cleaner direct shot.
  'Amul Butter Salted':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/A_stick_of_butter_with_wrapper_partially_removed_2023.jpg/640px-A_stick_of_butter_with_wrapper_partially_removed_2023.jpg',

  // Brown eggs — use egg carton image
  'Brown Eggs (Free-range)':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Brown_eggs_in_a_basket.jpg/640px-Brown_eggs_in_a_basket.jpg',

  // Actual green chillies, not Madame Jeanette
  'Green Chillies':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Green_Chili_Peppers.jpg/640px-Green_Chili_Peppers.jpg',

  // Table salt, not rock salt crystal
  'Tata Salt':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Sel_gemme.jpg/640px-Sel_gemme.jpg',

  // Cooking oil bottle
  'Fortune Sunflower Oil':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Sunflower_oil_bottle.jpg/640px-Sunflower_oil_bottle.jpg',

  // Harpic got a vacuum cleaner — null out, let glyph render
  'Harpic Bathroom Cleaner': null,

  // Chicken breast (raw cut) not live chickens
  'Chicken Breast (Boneless)':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Raw_chicken_breast_fillets_01.jpg/640px-Raw_chicken_breast_fillets_01.jpg',

  // Chicken thighs
  'Chicken Thigh (Bone-in)':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Roasted_chicken_thighs.jpg/640px-Roasted_chicken_thighs.jpg',

  // Keema — minced meat, not sausage-making
  'Chicken Keema':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Keema_matar.jpg/640px-Keema_matar.jpg',

  // Paracetamol pill photo (not chemical structure)
  'Crocin 500 Advance':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Paracetamol_tablets.jpg/640px-Paracetamol_tablets.jpg',
  'Paracetamol 650mg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Paracetamol_tablets.jpg/640px-Paracetamol_tablets.jpg',

  // ORS — glass/packet
  'ORS Rehydration Sachet':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Rehydration_salts_%28ORS%29.jpg/640px-Rehydration_salts_%28ORS%29.jpg',

  // Maggi noodles, not the logo
  'Maggi Noodles Multipack':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Maggi_Noodles_2_Minutes.jpg/640px-Maggi_Noodles_2_Minutes.jpg',

  // Malai sandwich / cham-cham style Bengali sweet
  'Malai Sandwich':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Chamcham.jpg/640px-Chamcham.jpg',

  // Dettol Handwash → liquid soap dispenser
  'Dettol Handwash Refill':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Liquid_soap_dispenser.jpg/640px-Liquid_soap_dispenser.jpg',
};

async function verifyUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'MagarpattaGo/0.1 seed-verify' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔧 Applying curated image overrides…\n');
  let applied = 0;
  let cleared = 0;
  let broken = 0;

  for (const [productName, url] of Object.entries(OVERRIDES)) {
    const product = await prisma.product.findFirst({ where: { name: productName } });
    if (!product) {
      console.log(`  ⚠️  not in DB: ${productName}`);
      continue;
    }

    if (url === null) {
      await prisma.product.update({ where: { id: product.id }, data: { imageUrl: null } });
      console.log(`  ∅  cleared: ${productName} (will use glyph)`);
      cleared++;
      continue;
    }

    const ok = await verifyUrl(url);
    if (!ok) {
      // fallback: clear instead of using a broken URL
      await prisma.product.update({ where: { id: product.id }, data: { imageUrl: null } });
      console.log(`  ✗  ${productName} — URL 404, cleared to glyph`);
      broken++;
      continue;
    }

    await prisma.product.update({ where: { id: product.id }, data: { imageUrl: url } });
    console.log(`  ✓  ${productName}`);
    applied++;
  }

  console.log(`\n✅ ${applied} overrides applied · ${cleared} cleared to glyph · ${broken} broken URLs fallen back.`);
}

main()
  .catch((e) => {
    console.error('❌ Fix failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
