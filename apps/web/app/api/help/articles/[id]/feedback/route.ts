import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Public, anonymous feedback endpoint. Increments the helpfulCount /
 *  notHelpfulCount counters on the article. No auth needed — these counters
 *  drive article quality scoring; abuse is mitigated by the simple click-rate
 *  signal not being used for any privileged decision. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: { helpful?: boolean };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }

  const helpful = body.helpful === true;
  const article = await prisma.kbArticle.findUnique({ where: { id }, select: { id: true, isPublic: true, archived: true } });
  if (!article || !article.isPublic || article.archived) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  await prisma.kbArticle.update({
    where: { id },
    data: helpful ? { helpfulCount: { increment: 1 } } : { notHelpfulCount: { increment: 1 } },
  });

  return NextResponse.json({ ok: true });
}
