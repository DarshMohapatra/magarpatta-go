import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';
import { logActivity } from '@/lib/activity-log';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { note?: string };

  const change = await prisma.pendingChange.findUnique({ where: { id } });
  if (!change || change.status !== 'PENDING') {
    return NextResponse.json({ ok: false, error: 'Not pending' }, { status: 400 });
  }

  const note = body.note?.trim() || null;

  await prisma.$transaction(async (tx) => {
    if (change.entity === 'CAMPAIGN' && change.entityId) {
      // Mirror the reject onto the Campaign row so the Campaigns tab matches.
      if (change.operation === 'DELETE') {
        // Reject removal → keep the campaign running, clear the flag.
        await tx.campaign.update({
          where: { id: change.entityId },
          data: { pendingRemoval: false, pendingRemovalAt: null, approvalNote: note },
        });
      } else {
        // Reject CREATE or UPDATE → mark the campaign REJECTED.
        await tx.campaign.update({
          where: { id: change.entityId },
          data: { approvalStatus: 'REJECTED', approvalNote: note, approvedBy: admin.id },
        });
      }
    }

    await tx.pendingChange.update({
      where: { id },
      data: { status: 'REJECTED', reviewedBy: admin.id, reviewedAt: new Date(), reviewNote: note },
    });
  });

  await logActivity({
    actorRole: 'ADMIN',
    actorId: admin.id,
    actorName: admin.name,
    action: 'PENDING_CHANGE_REJECT',
    summary: `${admin.name} rejected ${change.entity.toLowerCase()} ${change.operation.toLowerCase()} — ${change.summary}`,
    metadata: { pendingChangeId: id, entity: change.entity, operation: change.operation, note },
  });

  return NextResponse.json({ ok: true });
}
