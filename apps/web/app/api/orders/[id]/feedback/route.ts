import { NextResponse } from 'next/server';
import { getCustomerScope } from '@/lib/customer-scope';

interface Body {
  foodRating?: number;
  foodComment?: string;
  deliveryRating?: number;
  deliveryComment?: string;
}

function clampRating(n: unknown): number | null {
  if (typeof n !== 'number') return null;
  const v = Math.round(n);
  if (v < 1 || v > 5) return null;
  return v;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getCustomerScope();
  if (!scope) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await params;

  // Wrapper rewrites where to include userId — feedback for someone else's
  // order returns null naturally.
  const feedback = await scope.db.orderFeedback.findUnique({ where: { orderId: id } });
  return NextResponse.json({ ok: true, feedback: feedback ?? null });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getCustomerScope();
  if (!scope) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { db } = scope;
  const { id } = await params;

  // Confirm the order exists AND belongs to this user (wrapper enforces both).
  const order = await db.order.findFirst({ where: { id } });
  if (!order) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  if (order.status !== 'DELIVERED') {
    return NextResponse.json({ ok: false, error: 'You can rate an order only after delivery.' }, { status: 400 });
  }

  const b = (await req.json()) as Body;
  const foodRating = clampRating(b.foodRating);
  const deliveryRating = clampRating(b.deliveryRating);
  if (foodRating == null && deliveryRating == null) {
    return NextResponse.json({ ok: false, error: 'Give at least one rating.' }, { status: 400 });
  }

  // Wrapper injects userId into both `where` and `create`.
  const feedback = await db.orderFeedback.upsert({
    where: { orderId: order.id },
    update: {
      foodRating, foodComment: b.foodComment?.trim().slice(0, 500) || null,
      deliveryRating, deliveryComment: b.deliveryComment?.trim().slice(0, 500) || null,
    },
    create: {
      // userId listed for type satisfaction; wrapper would override.
      userId: scope.userId,
      orderId: order.id,
      vendorId: order.vendorId ?? null,
      riderPhone: order.riderPhone ?? null,
      foodRating, foodComment: b.foodComment?.trim().slice(0, 500) || null,
      deliveryRating, deliveryComment: b.deliveryComment?.trim().slice(0, 500) || null,
    },
  });

  return NextResponse.json({ ok: true, feedback });
}
