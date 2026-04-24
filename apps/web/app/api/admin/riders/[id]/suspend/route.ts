import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { note?: string; unsuspend?: boolean };
  if (body.unsuspend) {
    const rider = await prisma.riderProfile.update({
      where: { id },
      data: { approvalStatus: 'APPROVED', approvalNote: null },
    });
    return NextResponse.json({ ok: true, rider });
  }
  const note = (body.note ?? '').trim().slice(0, 300) || 'Suspended';
  const rider = await prisma.riderProfile.update({
    where: { id },
    data: { approvalStatus: 'SUSPENDED', approvalNote: note, onDuty: false },
  });
  return NextResponse.json({ ok: true, rider });
}
