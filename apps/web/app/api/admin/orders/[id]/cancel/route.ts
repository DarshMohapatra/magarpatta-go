import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  const reason = (body.reason ?? '').trim().slice(0, 200) || 'Cancelled by admin';
  const order = await prisma.order.update({
    where: { id },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
  });
  return NextResponse.json({ ok: true, order });
}
