import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import { isTicketCategory } from '@/lib/support-tickets';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const url = new URL(req.url);
  const includeArchived = url.searchParams.get('archived') === '1';

  const articles = await prisma.kbArticle.findMany({
    where: includeArchived ? {} : { archived: false },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, slug: true, title: true, category: true, tags: true,
      isPublic: true, archived: true,
      helpfulCount: true, notHelpfulCount: true,
      createdAt: true, updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, articles });
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  let body: { title?: string; body?: string; category?: string; tags?: string[]; isPublic?: boolean; slug?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }

  const title = (body.title ?? '').trim();
  const text  = (body.body  ?? '').trim();
  if (title.length < 3 || title.length > 160) return NextResponse.json({ ok: false, error: 'Title must be 3–160 characters' }, { status: 400 });
  if (text.length  < 20 || text.length > 20000) return NextResponse.json({ ok: false, error: 'Body must be 20–20000 characters' }, { status: 400 });

  const category = body.category && isTicketCategory(body.category) ? body.category : null;
  const tags = (body.tags ?? []).map((t) => String(t).trim()).filter(Boolean).slice(0, 12);
  const isPublic = body.isPublic !== false;

  // Caller can override the slug for stable links; otherwise derive from title
  // and resolve collisions by appending -2, -3, ….
  let slug = (body.slug && slugify(body.slug)) || slugify(title) || 'untitled';
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? slug : `${slug}-${n}`;
    const exists = await prisma.kbArticle.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) { slug = candidate; break; }
  }

  const article = await prisma.kbArticle.create({
    data: { slug, title, body: text, category, tags, isPublic },
  });

  logActivity({
    actorRole: 'ADMIN',
    actorId: admin.id,
    actorName: admin.name,
    action: 'KB_CREATE',
    summary: `${admin.name} created KB article "${title}"`,
    metadata: { articleId: article.id, slug },
  });

  return NextResponse.json({ ok: true, article });
}
