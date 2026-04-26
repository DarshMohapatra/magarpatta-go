import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await params;
  const c = await prisma.campaign.update({
    where: { id },
    data: {
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: admin.id,
      approvalNote: null,
    },
  });
  revalidateTag('menu');
  return NextResponse.json({ ok: true, campaign: c });
}
