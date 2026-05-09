import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCuratorSession } from '@/lib/curator-session';
import { logActivity } from '@/lib/activity-log';

interface Body { note?: string }

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

  const body = (await req.json().catch(() => ({}))) as Body;
  const note = body.note?.trim();
  if (!note) return NextResponse.json({ ok: false, error: 'Reason required.' }, { status: 400 });

  await prisma.menuImportJob.update({
    where: { id },
    data: { status: 'REJECTED', curatorNote: note, curatedBy: c.id, curatedAt: new Date() },
  });

  await logActivity({
    actorRole: 'CURATOR',
    actorId: c.id,
    actorName: c.name,
    action: 'MENU_IMPORT_REJECT',
    summary: `${c.name} rejected ${job.vendor.name}'s menu upload`,
    metadata: { jobId: id, vendorId: job.vendorId, note },
  });

  return NextResponse.json({ ok: true });
}
