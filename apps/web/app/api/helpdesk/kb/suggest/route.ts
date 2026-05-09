import { NextResponse } from 'next/server';
import { getHelpdeskSession } from '@/lib/helpdesk-session';
import { prisma } from '@/lib/prisma';
import { suggestArticlesForTicket } from '@/lib/kb-suggest';

export const dynamic = 'force-dynamic';

/**
 * Returns up to 5 KB articles ranked for the given ticket. Records each
 * suggestion as a KbArticleView (kind=SUGGESTED) so analytics can later ask
 * "did surfacing the KB shorten resolution time?".
 */
export async function GET(req: Request) {
  const agent = await getHelpdeskSession();
  if (!agent) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const url = new URL(req.url);
  const ticketId = url.searchParams.get('ticketId');
  if (!ticketId) return NextResponse.json({ ok: false, error: 'Missing ticketId' }, { status: 400 });

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true, subject: true, category: true,
      messages: { orderBy: { createdAt: 'asc' }, take: 1, select: { body: true } },
    },
  });
  if (!ticket) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  // Don't suggest articles that have already been surfaced on this ticket
  // — they were either dismissed or didn't help. Keeps the suggestion list
  // useful as the conversation grows.
  const seen = await prisma.kbArticleView.findMany({
    where: { ticketId },
    select: { articleId: true },
  });
  const excludeArticleIds = seen.map((v) => v.articleId);

  const articles = await suggestArticlesForTicket({
    ticketSubject: ticket.subject,
    ticketCategory: ticket.category,
    ticketBody: ticket.messages[0]?.body ?? '',
    excludeArticleIds,
    limit: 5,
  });

  if (articles.length) {
    await prisma.kbArticleView.createMany({
      data: articles.map((a) => ({ articleId: a.id, ticketId, kind: 'SUGGESTED' })),
    });
  }

  return NextResponse.json({
    ok: true,
    articles: articles.map((a) => ({
      id: a.id, slug: a.slug, title: a.title, category: a.category,
      tags: a.tags, isPublic: a.isPublic,
      // Send a short body excerpt — full markdown loads on click.
      excerpt: a.body.slice(0, 220),
    })),
  });
}

/** Records when an agent actually opens an article from a ticket — the
 *  numerator for "suggestion → click-through" effectiveness. */
export async function POST(req: Request) {
  const agent = await getHelpdeskSession();
  if (!agent) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  let body: { ticketId?: string; articleId?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }
  if (!body.ticketId || !body.articleId) return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 });

  await prisma.kbArticleView.create({
    data: { articleId: body.articleId, ticketId: body.ticketId, kind: 'OPENED' },
  });

  return NextResponse.json({ ok: true });
}
