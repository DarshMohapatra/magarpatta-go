import { NextResponse } from 'next/server';
import { getCustomerScope } from '@/lib/customer-scope';
import { statusFromTimestamps } from '@/lib/orders';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getCustomerScope();
  if (!scope) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { db } = scope;

  const { id } = await params;

  // findFirst with `where: { id }` is automatically narrowed to this user's
  // orders by the customer-fence wrapper. Asking for someone else's id
  // returns null — the same 404 a guessing attacker would see for an order
  // that doesn't exist at all.
  const order = await db.order.findFirst({
    where: { id },
    include: { items: true },
  });

  if (!order) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });

  // Status only advances on real vendor / rider actions. As a safety net,
  // reconcile status against the row timestamps in case an API set a
  // timestamp without updating status.
  const derived = statusFromTimestamps(order);
  if (derived !== order.status) {
    await db.order.update({ where: { id: order.id }, data: { status: derived } });
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
