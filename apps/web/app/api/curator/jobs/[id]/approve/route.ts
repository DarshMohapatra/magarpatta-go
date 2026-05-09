import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCuratorSession } from '@/lib/curator-session';
import { queueChange } from '@/lib/pending-change';
import { logActivity } from '@/lib/activity-log';

interface ApproveItem {
  name?: string;
  mrpInr?: number;
  priceInr?: number;
  isVeg?: boolean;
  isRegulated?: boolean;
  unit?: string | null;
  description?: string | null;
}

interface Body {
  categorySlug?: string;
  items?: ApproveItem[];
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await getCuratorSession();
  if (!c) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  const job = await prisma.menuImportJob.findUnique({
    where: { id },
    include: { vendor: { select: { id: true, name: true } } },
  });
  if (!job) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  if (job.status !== 'PENDING_CURATOR') {
    return NextResponse.json({ ok: false, error: 'Already reviewed' }, { status: 400 });
  }

  const body = (await req.json()) as Body;
  const categorySlug = (body.categorySlug ?? job.categorySlug).trim();
  const incoming = Array.isArray(body.items) ? body.items : [];

  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!category) return NextResponse.json({ ok: false, error: 'Unknown category' }, { status: 400 });

  // Sanitise + queue each item as a PRODUCT/CREATE PendingChange. Admin sees
  // them in /admin/changes the same way single-item adds appear today.
  let queued = 0;
  for (const it of incoming) {
    const name = (it.name ?? '').trim();
    const mrp = Math.max(0, Math.floor(it.mrpInr ?? it.priceInr ?? 0));
    if (!name || mrp <= 0) continue;
    const isRegulated = it.isRegulated ?? false;
    const priceInr = isRegulated
      ? mrp
      : (typeof it.priceInr === 'number' && it.priceInr > mrp ? Math.floor(it.priceInr) : mrp + 1);

    const payload = {
      vendorId: job.vendorId,
      categoryId: category.id,
      categorySlug,
      name,
      description: it.description?.trim() || null,
      priceInr,
      mrpInr: mrp,
      isRegulated,
      isVeg: it.isVeg ?? true,
      unit: it.unit?.trim() || null,
      imageUrl: null,
      accent: 'forest',
      glyph: category.glyph || 'leaf',
    };

    await queueChange({
      entity: 'PRODUCT',
      entityId: null,
      operation: 'CREATE',
      payload: payload as never,
      summary: `${job.vendor.name} · curated import "${name}"`,
      vendorId: job.vendorId,
    });
    queued++;
  }

  if (queued === 0) {
    return NextResponse.json({ ok: false, error: 'No valid items to approve.' }, { status: 400 });
  }

  await prisma.menuImportJob.update({
    where: { id },
    data: {
      status: 'CURATED',
      categorySlug,
      items: incoming.slice(0, 200) as never,
      curatedBy: c.id,
      curatedAt: new Date(),
    },
  });

  await logActivity({
    actorRole: 'CURATOR',
    actorId: c.id,
    actorName: c.name,
    action: 'MENU_IMPORT_APPROVE',
    summary: `${c.name} forwarded ${queued} item${queued === 1 ? '' : 's'} from ${job.vendor.name} to admin`,
    metadata: { jobId: id, vendorId: job.vendorId, queued },
  });

  return NextResponse.json({ ok: true, queued });
}
