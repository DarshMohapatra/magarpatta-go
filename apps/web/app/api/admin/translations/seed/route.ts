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

// Phase-1 launch ships with wholesale Fresh Produce only (catalog whitelist
// is set to `produce` in admin settings). The dictionary below covers the
// 13 produce SKUs that exist in the seed catalogs — 12 from the wholesale
// Magarpatta Mandi seed plus Alphonso Mangoes from the curated seed.
//
// To extend coverage as more categories come online (dairy, meat, bakery,
// pharmacy), drop additional `'English Name': { hi, mr }` entries below.
const SEED: Record<string, { hi: string; mr: string }> = {
  'Alphonso Mangoes': { hi: 'अल्फांसो आम', mr: 'हापूस आंबा' },
  'Onions':           { hi: 'प्याज',         mr: 'कांदा' },
  'Potatoes':         { hi: 'आलू',           mr: 'बटाटा' },
  'Tomatoes':         { hi: 'टमाटर',         mr: 'टोमॅटो' },
  'Green Chillies':   { hi: 'हरी मिर्च',     mr: 'हिरवी मिरची' },
  'Coriander':        { hi: 'धनिया',         mr: 'कोथिंबीर' },
  'Baby Spinach':     { hi: 'बेबी पालक',     mr: 'बेबी पालक' },
  'Capsicum':         { hi: 'शिमला मिर्च',   mr: 'सिमला मिरची' },
  'Lemons':           { hi: 'नींबू',         mr: 'लिंबू' },
  'Bananas':          { hi: 'केला',          mr: 'केळी' },
  'Apples':           { hi: 'सेब',           mr: 'सफरचंद' },
  'Watermelon':       { hi: 'तरबूज',         mr: 'कलिंगड' },
  'Pomegranate':      { hi: 'अनार',          mr: 'डाळिंब' },
  'Pineapple':        { hi: 'अनानास',        mr: 'अननस' },
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
