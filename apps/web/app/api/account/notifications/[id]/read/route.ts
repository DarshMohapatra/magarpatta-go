import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';

/**
 * Mark a single notification read. Owner-scoped — passing someone else's
 * notification id is a 404, not a 403, to avoid leaking existence.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { phone: s.phone }, select: { id: true } });
  if (!user) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  const updated = await prisma.customerNotification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  if (updated.count === 0) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
