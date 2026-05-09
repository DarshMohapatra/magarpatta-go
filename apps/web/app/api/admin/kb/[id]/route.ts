import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import { isTicketCategory } from '@/lib/support-tickets';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;

  const article = await prisma.kbArticle.findUnique({ where: { id } });
  if (!article) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, article });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;

  let body: {
    title?: string; body?: string; category?: string | null;
    tags?: string[]; isPublic?: boolean; archived?: boolean;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }

  const article = await prisma.kbArticle.findUnique({ where: { id } });
  if (!article) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const title = body.title.trim();
    if (title.length < 3 || title.length > 160) return NextResponse.json({ ok: false, error: 'Title must be 3–160 characters' }, { status: 400 });
    data.title = title;
  }
  if (body.body !== undefined) {
    const text = body.body.trim();
    if (text.length < 20 || text.length > 20000) return NextResponse.json({ ok: false, error: 'Body must be 20–20000 characters' }, { status: 400 });
    data.body = text;
  }
  if (body.category !== undefined) {
    if (body.category === null) data.category = null;
    else if (isTicketCategory(body.category)) data.category = body.category;
    else return NextResponse.json({ ok: false, error: 'Invalid category' }, { status: 400 });
  }
  if (body.tags !== undefined) {
    data.tags = body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 12);
  }
  if (body.isPublic !== undefined) data.isPublic = !!body.isPublic;
  if (body.archived !== undefined) data.archived = !!body.archived;

  if (Object.keys(data).length === 0) return NextResponse.json({ ok: false, error: 'No changes' }, { status: 400 });

  await prisma.kbArticle.update({ where: { id }, data });

  logActivity({
    actorRole: 'ADMIN',
    actorId: admin.id,
    actorName: admin.name,
    action: 'KB_UPDATE',
    summary: `${admin.name} updated KB article "${article.title}"`,
    metadata: { articleId: id, fields: Object.keys(data) },
  });

  return NextResponse.json({ ok: true });
}

/** Soft-delete: archives instead of removing, so historical KbArticleViews
 *  retain their FK and analytics still work. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;
  const article = await prisma.kbArticle.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!article) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  await prisma.kbArticle.update({ where: { id }, data: { archived: true } });

  logActivity({
    actorRole: 'ADMIN',
    actorId: admin.id,
    actorName: admin.name,
    action: 'KB_ARCHIVE',
    summary: `${admin.name} archived KB article "${article.title}"`,
    metadata: { articleId: id },
  });

  return NextResponse.json({ ok: true });
}
