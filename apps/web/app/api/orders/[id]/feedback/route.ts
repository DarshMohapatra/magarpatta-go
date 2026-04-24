import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';

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
  const session = await getServerSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { phone: session.phone } });
  if (!user) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  const feedback = await prisma.orderFeedback.findUnique({ where: { orderId: id } });
  if (!feedback || feedback.userId !== user.id) return NextResponse.json({ ok: true, feedback: null });
  return NextResponse.json({ ok: true, feedback });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { phone: session.phone } });
  if (!user) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  const order = await prisma.order.findFirst({ where: { id, userId: user.id } });
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

  const feedback = await prisma.orderFeedback.upsert({
    where: { orderId: order.id },
    update: {
      foodRating, foodComment: b.foodComment?.trim().slice(0, 500) || null,
      deliveryRating, deliveryComment: b.deliveryComment?.trim().slice(0, 500) || null,
    },
    create: {
      orderId: order.id,
      userId: user.id,
      vendorId: order.vendorId ?? null,
      riderPhone: order.riderPhone ?? null,
      foodRating, foodComment: b.foodComment?.trim().slice(0, 500) || null,
      deliveryRating, deliveryComment: b.deliveryComment?.trim().slice(0, 500) || null,
    },
  });

  return NextResponse.json({ ok: true, feedback });
}
