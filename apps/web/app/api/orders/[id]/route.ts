import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';
import { expectedStatusForElapsed } from '@/lib/orders';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { phone: session.phone } });
  if (!user) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });

  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: { items: true },
  });

  if (!order) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });

  const elapsed = Math.floor((Date.now() - order.placedAt.getTime()) / 1000);
  const expected = expectedStatusForElapsed(elapsed);

  // Persist status transitions so timestamps land on the DB (acceptedAt etc).
  if (expected !== order.status) {
    const patch: Record<string, Date> = {};
    const now = new Date();
    if (expected === 'ACCEPTED' && !order.acceptedAt) patch.acceptedAt = now;
    if (expected === 'PICKED_UP' && !order.pickedUpAt) patch.pickedUpAt = now;
    if (expected === 'DELIVERED' && !order.deliveredAt) patch.deliveredAt = now;
    await prisma.order.update({
      where: { id: order.id },
      data: { status: expected, ...patch },
    });
    order.status = expected;
  }

  return NextResponse.json({
    ok: true,
    order: {
      ...order,
      elapsedSeconds: elapsed,
    },
  });
}
