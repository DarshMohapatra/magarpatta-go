import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { note?: string };
  const note = body.note?.trim() || null;

  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    if (existing.pendingRemoval) {
      // Rejecting a removal → clear the flag; campaign keeps running.
      await tx.campaign.update({
        where: { id },
        data: { pendingRemoval: false, pendingRemovalAt: null, approvalNote: note },
      });
    } else {
      await tx.campaign.update({
        where: { id },
        data: { approvalStatus: 'REJECTED', approvalNote: note, approvedBy: admin.id },
      });
    }

    await tx.pendingChange.updateMany({
      where: { entity: 'CAMPAIGN', entityId: id, status: 'PENDING' },
      data: { status: 'REJECTED', reviewedBy: admin.id, reviewedAt: new Date(), reviewNote: note },
    });
  });

  return NextResponse.json({ ok: true });
}
