import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Product name → Wikipedia article title. Wikimedia returns a permanent
// thumbnail URL per article which is legal to hotlink (CC licensing).
const WIKI_MAP: Record<string, string> = {
  // Kalika Sweets
  'Hot Jalebi':                'Jalebi',
  'Samosa':                    'Samosa',
  'Kaju Katli':                'Kaju katli',
  'Gulab Jamun':               'Gulab jamun',
  'Sev Batata Puri':           'Pani puri',
  'Kachori':                   'Kachori',
  'Malai Sandwich':            'Malai',
  // Dairy
  'Amul Gold Milk':            'Milk',
  'Amul Butter Salted':        'Butter',
  'Brown Eggs (Free-range)':   'Egg as food',
  'Mother Dairy Dahi':         'Dahi (curd)',
  'Paneer (Fresh Cut)':        'Paneer',
  // Produce
  'Alphonso Mangoes':          'Alphonso (mango)',
  'Onions':                    'Onion',
  'Potatoes':                  'Potato',
  'Tomatoes':                  'Tomato',
  'Baby Spinach':              'Spinach',
  'Green Chillies':            'Chili pepper',
  // Groceries
  'Aashirvaad Atta':           'Atta flour',
  'Tata Salt':                 'Salt',
  'MDH Garam Masala':          'Garam masala',
  'Kissan Mixed Fruit Jam':    'Fruit preserves',
  'Fortune Sunflower Oil':     'Sunflower oil',
  'Tata Tea Gold':             'Masala chai',
  // Essentials
  'Dettol Original Soap':      'Soap',
  'Surf Excel Quick Wash':     'Laundry detergent',
  'Colgate MaxFresh':          'Toothpaste',
  'Maggi Noodles Multipack':   'Maggi',
  'Harpic Bathroom Cleaner':   'Cleaning agent',
  // Meat
  'Chicken Breast (Boneless)': 'Chicken as food',
  'Chicken Thigh (Bone-in)':   'Poultry',
  'Chicken Keema':             'Keema',
  'Mutton Curry Cut':          'Mutton curry',
  'Rohu Fish (Cleaned)':       'Rohu',
  // Medicines
  'Crocin 500 Advance':        'Paracetamol',
  'Paracetamol 650mg':         'Paracetamol',
  'Vicks VapoRub':             'Vicks VapoRub',
  'Dettol Handwash Refill':    'Hand sanitizer',
  'ORS Rehydration Sachet':    'Oral rehydration therapy',
  'Strepsils Menthol':         'Throat lozenge',
  // Bakery
  'Sourdough Loaf':            'Sourdough',
  'Almond Croissant':          'Croissant',
  'Chocolate Cookies':         'Chocolate chip cookie',
  'Banana Bread Loaf':         'Banana bread',
  // Beverages
  'Tall Cappuccino':           'Cappuccino',
  'Cold Brew':                 'Cold brew coffee',
  'Caramel Macchiato':         'Caffè macchiato',
  'Blueberry Muffin':          'Muffin',
};

async function fetchWikiThumb(title: string): Promise<string | null> {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'MagarpattaGo/0.1 (development seed; hotlinking CC-licensed images)',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Prefer the larger "originalimage" if present, else thumbnail
    const img =
      (data.originalimage?.source as string | undefined) ??
      (data.thumbnail?.source as string | undefined) ??
      null;
    return img;
  } catch {
    return null;
  }
}

async function main() {
  console.log('🖼️  Fetching Wikipedia thumbnails for products…\n');
  let updated = 0;
  let missing = 0;

  for (const [productName, wikiTitle] of Object.entries(WIKI_MAP)) {
    const img = await fetchWikiThumb(wikiTitle);
    if (!img) {
      console.log(`  ⚠️  ${productName} — no image found (tried "${wikiTitle}")`);
      missing++;
      continue;
    }
    const product = await prisma.product.findFirst({ where: { name: productName } });
    if (!product) {
      console.log(`  ⚠️  product not in DB: ${productName}`);
      missing++;
      continue;
    }
    await prisma.product.update({ where: { id: product.id }, data: { imageUrl: img } });
    const short = img.replace('https://upload.wikimedia.org/wikipedia/commons/', '…/');
    console.log(`  ✓ ${productName.padEnd(30)} → ${short}`);
    updated++;
    // polite delay
    await new Promise((r) => setTimeout(r, 120));
  }

  console.log(`\n✅ ${updated} updated, ${missing} missing.`);
  if (missing > 0) {
    console.log(`    Missing products still have their old loremflickr URL; ProductCard\n    falls back to the glyph icon on load-error.`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
