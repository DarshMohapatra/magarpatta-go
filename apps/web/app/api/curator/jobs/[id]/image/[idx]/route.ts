import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCuratorSession } from '@/lib/curator-session';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; idx: string }> }) {
  const c = await getCuratorSession();
  if (!c) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const { id, idx } = await params;
  const ord = Number(idx);
  if (!Number.isFinite(ord) || ord < 0) {
    return NextResponse.json({ ok: false, error: 'Bad index' }, { status: 400 });
  }

  const image = await prisma.menuImportImage.findFirst({
    where: { jobId: id, ord },
    select: { bytes: true, mime: true },
  });
  if (!image) return new NextResponse('Not found', { status: 404 });

  return new NextResponse(new Uint8Array(image.bytes), {
    headers: {
      'Content-Type': image.mime,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
