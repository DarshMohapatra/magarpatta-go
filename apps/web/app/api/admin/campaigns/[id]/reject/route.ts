import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { note?: string };

  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  // Rejecting a removal request → just clear the flag; the campaign keeps
  // running unchanged.
  if (existing.pendingRemoval) {
    const c = await prisma.campaign.update({
      where: { id },
      data: {
        pendingRemoval: false,
        pendingRemovalAt: null,
        approvalNote: body.note?.trim() || null,
      },
    });
    return NextResponse.json({ ok: true, campaign: c });
  }

  const c = await prisma.campaign.update({
    where: { id },
    data: {
      approvalStatus: 'REJECTED',
      approvalNote: body.note?.trim() || null,
      approvedBy: admin.id,
    },
  });
  return NextResponse.json({ ok: true, campaign: c });
}
