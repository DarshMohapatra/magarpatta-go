import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';
import { expectedStatusForElapsed } from '@/lib/orders';

interface IncomingItem {
  productId: string;
  quantity: number;
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (!session.society || !session.building || !session.flat) {
    return NextResponse.json(
      { ok: false, error: 'Set a delivery address before placing an order' },
      { status: 400 },
    );
  }

  try {
    const body = (await req.json()) as { items: IncomingItem[]; notes?: string; paymentMethod?: 'COD' | 'UPI' | 'CARD' };
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ ok: false, error: 'Cart is empty' }, { status: 400 });
    }

    // Resolve products from DB (trust server-side prices, not client-submitted)
    const productIds = body.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, inStock: true },
      include: { vendor: true },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { ok: false, error: 'Some items are no longer available' },
        { status: 400 },
      );
    }

    const byId = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;
    const itemsForCreate = body.items.map((i) => {
      const p = byId.get(i.productId)!;
      const lineTotal = p.priceInr * Math.max(1, Math.floor(i.quantity));
      subtotal += lineTotal;
      return {
        productId: p.id,
        name: p.name,
        vendorName: p.vendor.name,
        unit: p.unit,
        priceInr: p.priceInr,
        quantity: Math.max(1, Math.floor(i.quantity)),
        accent: p.accent,
        glyph: p.glyph,
        imageUrl: p.imageUrl,
      };
    });

    const deliveryFee = 25;
    const total = subtotal + deliveryFee;

    // Find user
    const user = await prisma.user.upsert({
      where: { phone: session.phone },
      create: { phone: session.phone, name: session.name ?? undefined },
      update: {},
    });

    // Single-vendor orders get a pickup snapshot
    const uniqueVendors = [...new Set(products.map((p) => p.vendor.name))];
    const primaryVendor = uniqueVendors.length === 1 ? products[0].vendor : null;

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status: 'PLACED',
        paymentMethod: body.paymentMethod ?? 'COD',
        society: session.society,
        building: session.building,
        flat: session.flat,
        subtotalInr: subtotal,
        deliveryFeeInr: deliveryFee,
        totalInr: total,
        vendorName: primaryVendor?.name ?? (uniqueVendors.length > 1 ? 'Multi-vendor' : null),
        vendorHub: primaryVendor?.hub ?? null,
        notes: body.notes ?? null,
        items: { create: itemsForCreate },
      },
      include: { items: true },
    });

    return NextResponse.json({ ok: true, orderId: order.id });
  } catch (e) {
    console.error('[orders] POST failed:', e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message || 'Could not place order' },
      { status: 500 },
    );
  }
}

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { phone: session.phone } });
  if (!user) return NextResponse.json({ ok: true, orders: [] });

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { placedAt: 'desc' },
    include: { items: { select: { name: true, quantity: true, imageUrl: true, accent: true, glyph: true } } },
  });

  // Apply demo auto-progression on the fly
  const now = Date.now();
  const projected = orders.map((o) => {
    const elapsed = Math.floor((now - o.placedAt.getTime()) / 1000);
    const expected = expectedStatusForElapsed(elapsed);
    return { ...o, status: expected };
  });

  return NextResponse.json({ ok: true, orders: projected });
}
