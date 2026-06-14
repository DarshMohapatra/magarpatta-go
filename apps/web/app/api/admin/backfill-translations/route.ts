import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { translateMenuName } from '@/lib/gemini';
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
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { ok: false, error: 'GEMINI_API_KEY not set — nothing to backfill against.' },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  // Default 20 per batch: stays under gemini-2.0-flash's 15 RPM ceiling
  // once we factor in the 4.5s throttle between calls (20 calls × 4.5s
  // ≈ 90s, fits the maxDuration below). Smaller batches return more
  // often, so the admin UI can show steady progress.
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 20)));
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
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
    // Throttle: gemini-2.0-flash free tier is ~15 RPM, so 1 call every
    // ~4.5s keeps us safely under the ceiling. Skip the sleep after the
    // last item — no point delaying the response.
    if (i < products.length - 1) await sleep(4500);
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
