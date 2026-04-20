import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Map of product name → loremflickr keyword. Lock id keeps image stable per product.
// Replace with real CDN URLs once product photos are shot.
const IMAGES: Record<string, string> = {
  'Hot Jalebi':                   'https://loremflickr.com/640/480/jalebi,indian,sweet?lock=1001',
  'Samosa':                       'https://loremflickr.com/640/480/samosa,indian,snack?lock=1002',
  'Kaju Katli':                   'https://loremflickr.com/640/480/cashew,sweet,mithai?lock=1003',
  'Gulab Jamun':                  'https://loremflickr.com/640/480/gulab-jamun,indian,dessert?lock=1004',
  'Sev Batata Puri':              'https://loremflickr.com/640/480/chaat,streetfood,indian?lock=1005',
  'Kachori':                      'https://loremflickr.com/640/480/kachori,fried,indian?lock=1006',
  'Malai Sandwich':               'https://loremflickr.com/640/480/barfi,mithai,indian?lock=1007',
  'Amul Gold Milk':               'https://loremflickr.com/640/480/milk,carton,dairy?lock=2001',
  'Amul Butter Salted':           'https://loremflickr.com/640/480/butter,block,dairy?lock=2002',
  'Brown Eggs (Free-range)':      'https://loremflickr.com/640/480/eggs,brown,carton?lock=2003',
  'Mother Dairy Dahi':            'https://loremflickr.com/640/480/yogurt,curd,bowl?lock=2004',
  'Paneer (Fresh Cut)':           'https://loremflickr.com/640/480/paneer,cheese,block?lock=2005',
  'Alphonso Mangoes':             'https://loremflickr.com/640/480/mango,alphonso,fruit?lock=3001',
  'Onions':                       'https://loremflickr.com/640/480/onions,red,vegetable?lock=3002',
  'Potatoes':                     'https://loremflickr.com/640/480/potatoes,vegetable?lock=3003',
  'Tomatoes':                     'https://loremflickr.com/640/480/tomatoes,red,vegetable?lock=3004',
  'Baby Spinach':                 'https://loremflickr.com/640/480/spinach,greens,leafy?lock=3005',
  'Green Chillies':               'https://loremflickr.com/640/480/chilli,green,pepper?lock=3006',
  'Aashirvaad Atta':              'https://loremflickr.com/640/480/flour,wheat,sack?lock=4001',
  'Tata Salt':                    'https://loremflickr.com/640/480/salt,packet,kitchen?lock=4002',
  'MDH Garam Masala':             'https://loremflickr.com/640/480/masala,spice,powder?lock=4003',
  'Kissan Mixed Fruit Jam':       'https://loremflickr.com/640/480/jam,jar,fruit?lock=4004',
  'Fortune Sunflower Oil':        'https://loremflickr.com/640/480/cooking-oil,bottle?lock=4005',
  'Tata Tea Gold':                'https://loremflickr.com/640/480/tea,leaves,india?lock=4006',
  'Dettol Original Soap':         'https://loremflickr.com/640/480/soap,bar,bathroom?lock=5001',
  'Surf Excel Quick Wash':        'https://loremflickr.com/640/480/detergent,powder,laundry?lock=5002',
  'Colgate MaxFresh':             'https://loremflickr.com/640/480/toothpaste,tube?lock=5003',
  'Maggi Noodles Multipack':      'https://loremflickr.com/640/480/noodles,pack,maggi?lock=5004',
  'Harpic Bathroom Cleaner':      'https://loremflickr.com/640/480/cleaner,bottle,blue?lock=5005',
  'Chicken Breast (Boneless)':    'https://loremflickr.com/640/480/chicken,breast,raw?lock=6001',
  'Chicken Thigh (Bone-in)':      'https://loremflickr.com/640/480/chicken,thigh,meat?lock=6002',
  'Chicken Keema':                'https://loremflickr.com/640/480/mince,meat,ground?lock=6003',
  'Mutton Curry Cut':             'https://loremflickr.com/640/480/mutton,lamb,meat?lock=6004',
  'Rohu Fish (Cleaned)':          'https://loremflickr.com/640/480/fish,rohu,raw?lock=6005',
  'Crocin 500 Advance':           'https://loremflickr.com/640/480/tablet,medicine,strip?lock=7001',
  'Paracetamol 650mg':            'https://loremflickr.com/640/480/paracetamol,pills?lock=7002',
  'Vicks VapoRub':                'https://loremflickr.com/640/480/ointment,jar,blue?lock=7003',
  'Dettol Handwash Refill':       'https://loremflickr.com/640/480/handwash,soap,bottle?lock=7004',
  'ORS Rehydration Sachet':       'https://loremflickr.com/640/480/sachet,powder,medicine?lock=7005',
  'Strepsils Menthol':            'https://loremflickr.com/640/480/lozenge,throat,menthol?lock=7006',
  'Sourdough Loaf':               'https://loremflickr.com/640/480/sourdough,bread,loaf?lock=8001',
  'Almond Croissant':             'https://loremflickr.com/640/480/croissant,almond,pastry?lock=8002',
  'Chocolate Cookies':            'https://loremflickr.com/640/480/cookies,chocolate,baked?lock=8003',
  'Banana Bread Loaf':            'https://loremflickr.com/640/480/banana-bread,loaf?lock=8004',
  'Tall Cappuccino':              'https://loremflickr.com/640/480/cappuccino,coffee,cup?lock=9001',
  'Cold Brew':                    'https://loremflickr.com/640/480/cold-brew,coffee,glass?lock=9002',
  'Caramel Macchiato':            'https://loremflickr.com/640/480/macchiato,coffee?lock=9003',
  'Blueberry Muffin':             'https://loremflickr.com/640/480/muffin,blueberry,bakery?lock=9004',
};

async function main() {
  console.log('🖼️  Adding images to products…');
  let updated = 0;
  let skipped = 0;

  for (const [name, url] of Object.entries(IMAGES)) {
    const product = await prisma.product.findFirst({ where: { name } });
    if (!product) {
      console.warn(`  ⚠️  not found: ${name}`);
      skipped++;
      continue;
    }
    await prisma.product.update({ where: { id: product.id }, data: { imageUrl: url } });
    updated++;
  }

  console.log(`\n✅ ${updated} updated, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error('❌ Image seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
