import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { note?: string };
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
