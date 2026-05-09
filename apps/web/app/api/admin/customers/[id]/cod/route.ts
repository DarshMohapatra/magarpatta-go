import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';
import { logActivity } from '@/lib/activity-log';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await params;

  let body: { approve?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 });
  }
  if (typeof body.approve !== 'boolean') {
    return NextResponse.json({ ok: false, error: 'approve must be boolean' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { codApprovedByAdmin: body.approve },
    select: { id: true, phone: true, name: true, codApprovedByAdmin: true },
  });

  await logActivity({
    actorRole: 'ADMIN',
    actorId: admin.id,
    actorName: admin.name,
    action: body.approve ? 'CUSTOMER_COD_APPROVED' : 'CUSTOMER_COD_REVOKED',
    summary: `${body.approve ? 'Approved' : 'Revoked'} COD for ${updated.name ?? '+91 ' + updated.phone}`,
    metadata: { userId: updated.id, phone: updated.phone },
  });

  return NextResponse.json({ ok: true, user: updated });
}
