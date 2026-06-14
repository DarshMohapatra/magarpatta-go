import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';
import { logActivity } from '@/lib/activity-log';

/**
 * One-shot seed of Hindi + Marathi translations for the products that ship
 * with the launch catalog. Match is by exact English `name` — anything not
 * in this dictionary stays untranslated and the admin fills it via the
 * `/admin/translations` editor.
 *
 * Idempotent: re-running silently overwrites whatever's there, so it's
 * safe to invoke any number of times. Useful for resetting test data.
 *
 * Auth: admin session (SUPER_ADMIN or OPS only).
 */

const SEED: Record<string, { hi: string; mr: string }> = {
  // Sweets & snacks
  'Hot Jalebi': { hi: 'गरम जलेबी', mr: 'गरम जिलेबी' },
  'Samosa': { hi: 'समोसा', mr: 'समोसा' },
  'Kaju Katli': { hi: 'काजू कतली', mr: 'काजू कतली' },
  'Gulab Jamun': { hi: 'गुलाब जामुन', mr: 'गुलाब जामून' },
  'Sev Batata Puri': { hi: 'सेव बटाटा पुरी', mr: 'सेव बटाटा पुरी' },
  'Kachori': { hi: 'कचौरी', mr: 'कचोरी' },
  'Malai Sandwich': { hi: 'मलाई सैंडविच', mr: 'मलई सँडविच' },

  // Dairy & eggs
  'Amul Gold Milk': { hi: 'अमूल गोल्ड दूध', mr: 'अमूल गोल्ड दूध' },
  'Amul Butter Salted': { hi: 'अमूल नमकीन मक्खन', mr: 'अमूल खारट लोणी' },
  'Brown Eggs (Free-range)': { hi: 'भूरे अंडे (फ्री-रेंज)', mr: 'तपकिरी अंडी (फ्री-रेंज)' },
  'Brown Eggs (Tray)': { hi: 'भूरे अंडे (ट्रे)', mr: 'तपकिरी अंडी (ट्रे)' },
  'White Eggs (Half-dozen)': { hi: 'सफेद अंडे (आधा दर्जन)', mr: 'पांढरी अंडी (अर्धा डझन)' },
  'Mother Dairy Dahi': { hi: 'मदर डेयरी दही', mr: 'मदर डेअरी दही' },
  'Paneer (Fresh Cut)': { hi: 'पनीर (ताज़ा कटा)', mr: 'पनीर (ताजे कापलेले)' },

  // Produce
  'Alphonso Mangoes': { hi: 'अल्फांसो आम', mr: 'हापूस आंबा' },
  'Onions': { hi: 'प्याज', mr: 'कांदा' },
  'Potatoes': { hi: 'आलू', mr: 'बटाटा' },
  'Tomatoes': { hi: 'टमाटर', mr: 'टोमॅटो' },
  'Baby Spinach': { hi: 'बेबी पालक', mr: 'बेबी पालक' },
  'Green Chillies': { hi: 'हरी मिर्च', mr: 'हिरवी मिरची' },
  'Coriander': { hi: 'धनिया', mr: 'कोथिंबीर' },
  'Capsicum': { hi: 'शिमला मिर्च', mr: 'सिमला मिरची' },
  'Lemons': { hi: 'नींबू', mr: 'लिंबू' },
  'Bananas': { hi: 'केला', mr: 'केळी' },
  'Apples': { hi: 'सेब', mr: 'सफरचंद' },
  'Watermelon': { hi: 'तरबूज', mr: 'कलिंगड' },
  'Pomegranate': { hi: 'अनार', mr: 'डाळिंब' },

  // Pantry staples
  'Aashirvaad Atta': { hi: 'आशीर्वाद आटा', mr: 'आशीर्वाद कणीक' },
  'Tata Salt': { hi: 'टाटा नमक', mr: 'टाटा मीठ' },
  'MDH Garam Masala': { hi: 'MDH गरम मसाला', mr: 'MDH गरम मसाला' },
  'Kissan Mixed Fruit Jam': { hi: 'किसान मिक्स्ड फ्रूट जैम', mr: 'किसान मिक्स्ड फ्रूट जॅम' },
  'Fortune Sunflower Oil': { hi: 'फॉर्च्यून सूरजमुखी तेल', mr: 'फॉर्च्यून सूर्यफूल तेल' },
  'Tata Tea Gold': { hi: 'टाटा टी गोल्ड', mr: 'टाटा टी गोल्ड' },
  'Maggi Noodles Multipack': { hi: 'मैगी नूडल्स मल्टीपैक', mr: 'मॅगी नूडल्स मल्टीपॅक' },

  // Daily essentials
  'Dettol Original Soap': { hi: 'डेटॉल ओरिजिनल साबुन', mr: 'डेटॉल ओरिजिनल साबण' },
  'Surf Excel Quick Wash': { hi: 'सर्फ एक्सेल क्विक वॉश', mr: 'सर्फ एक्सेल क्विक वॉश' },
  'Colgate MaxFresh': { hi: 'कोलगेट मैक्सफ्रेश', mr: 'कोलगेट मॅक्सफ्रेश' },
  'Harpic Bathroom Cleaner': { hi: 'हार्पिक बाथरूम क्लीनर', mr: 'हार्पिक बाथरूम क्लीनर' },

  // Meat
  'Chicken Breast (Boneless)': { hi: 'चिकन ब्रेस्ट (बोनलेस)', mr: 'चिकन ब्रेस्ट (हाडे नसलेले)' },
  'Chicken Thigh (Bone-in)': { hi: 'चिकन थाई (हड्डी सहित)', mr: 'चिकन थाय (हाडासह)' },
  'Chicken Keema': { hi: 'चिकन कीमा', mr: 'चिकन खिमा' },
  'Mutton Curry Cut': { hi: 'मटन करी कट', mr: 'मटण करी कट' },
  'Rohu Fish (Cleaned)': { hi: 'रोहू मछली (साफ की हुई)', mr: 'रोहू मासे (स्वच्छ केलेले)' },

  // Medicines
  'Crocin 500 Advance': { hi: 'क्रोसिन 500 एडवांस', mr: 'क्रोसिन 500 अ‍ॅडव्हान्स' },
  'Paracetamol 650mg': { hi: 'पैरासिटामोल 650mg', mr: 'पॅरासिटामॉल 650mg' },
  'Vicks VapoRub': { hi: 'विक्स वेपोरब', mr: 'व्हिक्स व्हेपोरब' },
  'Dettol Handwash Refill': { hi: 'डेटॉल हैंडवॉश रिफिल', mr: 'डेटॉल हँडवॉश रिफिल' },
  'ORS Rehydration Sachet': { hi: 'ORS रिहाइड्रेशन पाउच', mr: 'ORS रीहायड्रेशन पाकीट' },
  'Strepsils Menthol': { hi: 'स्ट्रेप्सिल्स मेंथॉल', mr: 'स्ट्रेप्सिल्स मेन्थॉल' },

  // Bakery
  'Sourdough Loaf': { hi: 'खट्टे आटे की रोटी', mr: 'आंबट पाव' },
  'Almond Croissant': { hi: 'बादाम क्रोसां', mr: 'बदाम क्रोसां' },
  'Chocolate Cookies': { hi: 'चॉकलेट कुकीज़', mr: 'चॉकलेट कुकीज' },
  'Banana Bread Loaf': { hi: 'केला ब्रेड', mr: 'केळी पाव' },
  'Whole-Wheat Bread Loaf': { hi: 'गेहूं की ब्रेड', mr: 'गव्हाचा पाव' },
  'Pav (Bread Rolls)': { hi: 'पाव', mr: 'पाव' },
  'Multigrain Bread Loaf': { hi: 'मल्टीग्रेन ब्रेड', mr: 'मल्टिग्रेन पाव' },

  // Beverages
  'Tall Cappuccino': { hi: 'टॉल कैप्पुचीनो', mr: 'टॉल कॅपुचिनो' },
  'Cold Brew': { hi: 'कोल्ड ब्रू', mr: 'कोल्ड ब्रू' },
  'Caramel Macchiato': { hi: 'कैरामेल मैक्यिआटो', mr: 'कॅरमल मॅकिआटो' },
  'Blueberry Muffin': { hi: 'ब्लूबेरी मफिन', mr: 'ब्लूबेरी मफिन' },
};

export async function POST() {
  const admin = await getAdminSession();
  if (!admin || (admin.role !== 'SUPER_ADMIN' && admin.role !== 'OPS')) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Pull every product whose English name is in the dictionary. exact match
  // is fine — we control the seed data, so spelling is predictable.
  const products = await prisma.product.findMany({
    where: { name: { in: Object.keys(SEED) } },
    select: { id: true, name: true },
  });

  let updated = 0;
  await prisma.$transaction(
    products.map((p) => {
      const tx = SEED[p.name]!;
      updated++;
      return prisma.product.update({
        where: { id: p.id },
        data: { nameHi: tx.hi, nameMr: tx.mr },
      });
    }),
  );

  // Make the new names visible to customers without waiting for the 30s
  // menu-cache TTL.
  revalidateTag('menu');

  await logActivity({
    actorRole: 'ADMIN',
    actorId: admin.id,
    actorName: admin.name,
    action: 'TRANSLATIONS_SEED',
    summary: `${admin.name} applied seed translations to ${updated} catalog items`,
    metadata: { updated, dictionarySize: Object.keys(SEED).length },
  });

  return NextResponse.json({
    ok: true,
    updated,
    dictionarySize: Object.keys(SEED).length,
    matchedNames: products.map((p) => p.name),
  });
}
