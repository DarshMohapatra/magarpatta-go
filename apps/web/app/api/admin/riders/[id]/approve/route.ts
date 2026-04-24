import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await params;
  const rider = await prisma.riderProfile.update({
    where: { id },
    data: { approvalStatus: 'APPROVED', approvedAt: new Date(), approvalNote: null },
  });
  return NextResponse.json({ ok: true, rider });
}
