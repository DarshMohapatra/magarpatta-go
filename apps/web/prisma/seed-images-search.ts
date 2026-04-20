import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Products that need a better image than "null (glyph)". For each, we'll run
// a Wikimedia Commons file search and use the top result's 640-wide thumb.
const SEARCH_MAP: Record<string, string> = {
  'Amul Butter Salted':        'butter block dairy',
  'Brown Eggs (Free-range)':   'brown eggs carton',
  'Green Chillies':            'green chilli pepper vegetable',
  'Tata Salt':                 'table salt white',
  'Fortune Sunflower Oil':     'cooking oil bottle',
  'Chicken Breast (Boneless)': 'raw chicken breast',
  'Chicken Thigh (Bone-in)':   'chicken thigh raw',
  'Chicken Keema':             'keema minced meat',
  'Crocin 500 Advance':        'paracetamol tablets blister',
  'Paracetamol 650mg':         'paracetamol tablets pills',
  'ORS Rehydration Sachet':    'oral rehydration solution packet',
  'Maggi Noodles Multipack':   'instant noodles pack',
  'Malai Sandwich':            'chamcham bengali sweet',
  'Dettol Handwash Refill':    'liquid hand soap bottle',
};

interface CommonsSearchResult {
  query?: {
    pages?: Record<
      string,
      {
        title: string;
        imageinfo?: Array<{ thumburl?: string; url?: string }>;
      }
    >;
  };
}

async function searchCommons(query: string): Promise<string | null> {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('generator', 'search');
  url.searchParams.set('gsrsearch', `filetype:bitmap ${query}`);
  url.searchParams.set('gsrnamespace', '6'); // File namespace
  url.searchParams.set('gsrlimit', '3');
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url|mime');
  url.searchParams.set('iiurlwidth', '640');
  url.searchParams.set('origin', '*');

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'MagarpattaGo/0.1 (hotlinking CC-licensed Commons images)',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as CommonsSearchResult;
    const pages = data.query?.pages;
    if (!pages) return null;
    // MediaWiki returns pages keyed by page ID; search order isn't guaranteed,
    // but page ids are usually sequential. Pick first with a thumb URL.
    for (const p of Object.values(pages)) {
      const info = p.imageinfo?.[0];
      const thumb = info?.thumburl;
      if (thumb && /\.(jpe?g|png|webp)$/i.test(thumb)) return thumb;
    }
    return null;
  } catch {
    return null;
  }
}

async function verifyUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔍 Searching Wikimedia Commons for missing images…\n');
  let found = 0;
  let missing = 0;

  for (const [productName, query] of Object.entries(SEARCH_MAP)) {
    const thumb = await searchCommons(query);
    if (!thumb) {
      console.log(`  ✗  ${productName.padEnd(30)} — no Commons match for "${query}"`);
      missing++;
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }
    const ok = await verifyUrl(thumb);
    if (!ok) {
      console.log(`  ✗  ${productName.padEnd(30)} — thumb 404`);
      missing++;
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }

    const product = await prisma.product.findFirst({ where: { name: productName } });
    if (!product) continue;
    await prisma.product.update({ where: { id: product.id }, data: { imageUrl: thumb } });
    const short = thumb.replace('https://upload.wikimedia.org/wikipedia/commons/thumb/', '…/');
    console.log(`  ✓  ${productName.padEnd(30)} → ${short}`);
    found++;
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n✅ ${found} found · ${missing} still on glyph fallback.`);
}

main()
  .catch((e) => {
    console.error('❌ Search failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
