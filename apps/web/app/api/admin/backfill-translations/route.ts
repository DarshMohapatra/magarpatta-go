import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { translateMenuName } from '@/lib/gemini';
import { asLocale } from '@/lib/i18n';

/**
 * One-shot backfill: walk every Product (and Category) that lacks a Hindi
 * or Marathi translation, call Gemini, save. Idempotent — only touches rows
 * where one of the i18n columns is null OR all three columns are identical
 * (the Gemini-fallback path saves the same text into all three when the
 * API key is missing; once the key is configured, re-running picks those
 * up too).
 *
 * Auth: requires the CRON_SECRET bearer token. Same pattern as the nightly
 * settlement cron — no admin session juggling needed; curl from anywhere.
 *
 * Usage:
 *   curl -X POST \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     https://<your-domain>/api/admin/backfill-translations
 *
 * Optional query param:
 *   ?limit=N — process at most N products in this call. Default 200 (well
 *   under a 60s Hobby timeout at ~1.5s per Gemini call). If you have more
 *   products than that, just hit the endpoint again — already-translated
 *   rows are skipped.
 */
export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { ok: false, error: 'GEMINI_API_KEY not set — nothing to backfill against.' },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') ?? 200)));

  // Pick up anything missing a translation OR where every column holds the
  // same English text (the Gemini-fallback case we want to retry).
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { nameHi: null },
        { nameMr: null },
        { AND: [{ nameHi: { equals: prisma.product.fields.name } }, { nameMr: { equals: prisma.product.fields.name } }] },
      ],
    },
    select: { id: true, name: true, nameSourceLang: true },
    take: limit,
    orderBy: { createdAt: 'asc' },
  });

  let productsTranslated = 0;
  for (const p of products) {
    const sourceLang = asLocale(p.nameSourceLang);
    const tx = await translateMenuName(p.name, sourceLang);
    // Skip if Gemini gave us back the same English in every slot — that
    // means the call failed and we don't want to overwrite with junk.
    if (tx.hi === tx.en && tx.mr === tx.en && tx.en === p.name) continue;
    await prisma.product.update({
      where: { id: p.id },
      data: { name: tx.en, nameHi: tx.hi, nameMr: tx.mr },
    });
    productsTranslated++;
  }

  // Same treatment for categories — seeded ones are already in Hindi/Marathi,
  // but vendor-suggested ones (future) would land here untranslated.
  const categories = await prisma.category.findMany({
    where: { OR: [{ nameHi: null }, { nameMr: null }] },
    select: { id: true, name: true, nameSourceLang: true },
  });
  let categoriesTranslated = 0;
  for (const c of categories) {
    const sourceLang = asLocale(c.nameSourceLang);
    const tx = await translateMenuName(c.name, sourceLang);
    if (tx.hi === tx.en && tx.mr === tx.en && tx.en === c.name) continue;
    await prisma.category.update({
      where: { id: c.id },
      data: { name: tx.en, nameHi: tx.hi, nameMr: tx.mr },
    });
    categoriesTranslated++;
  }

  return NextResponse.json({
    ok: true,
    productsTranslated,
    productsRemaining: Math.max(0, products.length === limit ? 1 : 0),
    categoriesTranslated,
  });
}
