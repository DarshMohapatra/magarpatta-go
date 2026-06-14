import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { translateMenuName } from '@/lib/translate';
import { asLocale } from '@/lib/i18n';
import { getAdminSession } from '@/lib/admin-session';

// Backfill loops with throttling — needs more than the default 10s Hobby
// timeout. 120s gives us headroom for the 20-call batch + 4.5s sleeps.
export const maxDuration = 120;

/**
 * One-shot backfill: walk every Product (and Category) that lacks a Hindi
 * or Marathi translation, call Gemini, save. Idempotent — only touches rows
 * where one of the i18n columns is null OR all three columns are identical
 * (the Gemini-fallback path saves the same text into all three when the
 * API key is missing; once the key is configured, re-running picks those
 * up too).
 *
 * Auth (either works):
 *   - signed-in admin (SUPER_ADMIN or OPS) — fires from the admin settings UI
 *   - Bearer CRON_SECRET — for curl / scheduled runs
 *
 * Optional query param:
 *   ?limit=N — process at most N products in this call. Default 200 (well
 *   under a 60s Hobby timeout at ~1.5s per Gemini call). If there are more
 *   products than that, the response carries productsRemaining: 1 and the
 *   UI calls again until it's 0.
 */
export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  const cronOk = process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  let sessionOk = false;
  if (!cronOk) {
    const admin = await getAdminSession();
    sessionOk = !!admin && (admin.role === 'SUPER_ADMIN' || admin.role === 'OPS');
  }
  if (!cronOk && !sessionOk) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.AZURE_TRANSLATOR_KEY || !process.env.AZURE_TRANSLATOR_REGION) {
    return NextResponse.json(
      { ok: false, error: 'Translator env not set (AZURE_TRANSLATOR_KEY and AZURE_TRANSLATOR_REGION required).' },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  // Azure Translator F0 free tier is generous (2M chars/month). 50 items per
  // batch is comfortable — no per-call throttle needed since we'd burn through
  // a typical 1-3 word translation in well under the rate cap. Returns often
  // enough for the admin UI to show steady progress.
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));

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
    // Skip if the helper returned the same text in every slot — that's the
    // fallback shape on a failed call and we don't want to lock in junk.
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
