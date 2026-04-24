import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';
import { statusFromTimestamps } from '@/lib/orders';

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

  // Status only advances on real vendor / rider actions. If no one has
  // touched the order yet, it stays at PLACED — no demo auto-progression.
  // As a safety net, reconcile status against the real timestamps on the row
  // (in case an API set a timestamp without updating status).
  const derived = statusFromTimestamps(order);
  if (derived !== order.status) {
    await prisma.order.update({ where: { id: order.id }, data: { status: derived } });
    order.status = derived;
  }

  const elapsed = Math.floor((Date.now() - order.placedAt.getTime()) / 1000);
  const finalElapsed =
    order.status === 'DELIVERED' && order.deliveredAt
      ? Math.floor((order.deliveredAt.getTime() - order.placedAt.getTime()) / 1000)
      : elapsed;

  return NextResponse.json({
    ok: true,
    order: {
      ...order,
      elapsedSeconds: finalElapsed,
    },
  });
}
