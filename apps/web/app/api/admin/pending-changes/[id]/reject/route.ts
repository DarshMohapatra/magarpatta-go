import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { note?: string };

  const change = await prisma.pendingChange.findUnique({ where: { id } });
  if (!change || change.status !== 'PENDING') {
    return NextResponse.json({ ok: false, error: 'Not pending' }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    // Rolling back a campaign-removal? Bring the campaign back to life so it
    // shows up on customer feeds again.
    if (change.entity === 'CAMPAIGN' && change.operation === 'DELETE' && change.entityId) {
      await tx.campaign.update({ where: { id: change.entityId }, data: { active: true } });
    }

    await tx.pendingChange.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: admin.id,
        reviewedAt: new Date(),
        reviewNote: body.note?.trim() || null,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
