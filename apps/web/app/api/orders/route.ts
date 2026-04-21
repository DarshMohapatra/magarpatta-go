import { NextResponse } from 'next/server';
import type { PaymentMethod } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';
import { expectedStatusForElapsed } from '@/lib/orders';
import { computeBreakdown } from '@/lib/pricing';

interface IncomingItem {
  productId: string;
  quantity: number;
}

interface IncomingBody {
  items: IncomingItem[];
  notes?: string;
  paymentMethod?: PaymentMethod;
  giftWrap?: boolean;
  insurance?: boolean;
  tipInr?: number;
  deliveryMode?: string;
  couponCode?: string;
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (!session.society || !session.building || !session.flat) {
    return NextResponse.json({ ok: false, error: 'Set a delivery address before placing an order' }, { status: 400 });
  }

  try {
    const body = (await req.json()) as IncomingBody;
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ ok: false, error: 'Cart is empty' }, { status: 400 });
    }

    const productIds = body.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, inStock: true },
      include: { vendor: true },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json({ ok: false, error: 'Some items are no longer available' }, { status: 400 });
    }

    // Single-vendor enforcement: reject mixed-vendor carts at the API boundary.
    const distinctVendors = new Set(products.map((p) => p.vendor.id));
    if (distinctVendors.size > 1) {
      return NextResponse.json(
        { ok: false, error: 'Each order must be from a single shop. Please split into separate orders.' },
        { status: 400 },
      );
    }

    const byId = new Map(products.map((p) => [p.id, p]));
    const priceItems = body.items.map((i) => {
      const p = byId.get(i.productId)!;
      const qty = Math.max(1, Math.floor(i.quantity));
      return {
        mrpInr: p.mrpInr ?? p.priceInr,
        priceInr: p.priceInr,
        isRegulated: p.isRegulated,
        quantity: qty,
        product: p,
      };
    });

    // Validate + load coupon
    let coupon = null as Awaited<ReturnType<typeof prisma.coupon.findUnique>> | null;
    if (body.couponCode) {
      coupon = await prisma.coupon.findUnique({ where: { code: body.couponCode.toUpperCase().trim() } });
      if (!coupon || !coupon.active) {
        return NextResponse.json({ ok: false, error: 'Invalid coupon' }, { status: 400 });
      }
      if (coupon.validUntil && coupon.validUntil < new Date()) {
        return NextResponse.json({ ok: false, error: 'This coupon has expired' }, { status: 400 });
      }
    }

    const breakdown = computeBreakdown(
      priceItems.map((i) => ({ mrpInr: i.mrpInr, priceInr: i.priceInr, isRegulated: i.isRegulated, quantity: i.quantity })),
      {
        giftWrap: body.giftWrap,
        insurance: body.insurance,
        tipInr: body.tipInr,
        coupon: coupon
          ? {
              type: coupon.type,
              percentOff: coupon.percentOff,
              flatOffInr: coupon.flatOffInr,
              minSubtotalInr: coupon.minSubtotalInr,
              maxDiscountInr: coupon.maxDiscountInr,
            }
          : null,
      },
    );

    if (coupon && breakdown.discountInr === 0 && breakdown.deliveryFeeInr !== 0) {
      return NextResponse.json(
        { ok: false, error: `Add ₹${coupon.minSubtotalInr - breakdown.subtotalInr} more to use ${coupon.code}` },
        { status: 400 },
      );
    }

    const user = await prisma.user.upsert({
      where: { phone: session.phone },
      create: { phone: session.phone, name: session.name ?? undefined },
      update: {},
    });

    const primaryVendor = products[0].vendor;

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status: 'PLACED',
        paymentMethod: body.paymentMethod ?? 'COD',
        society: session.society,
        building: session.building,
        flat: session.flat,
        subtotalInr: breakdown.subtotalInr,
        convenienceInr: breakdown.convenienceInr,
        taxInr: breakdown.taxInr,
        addOnsInr: breakdown.addOnsInr,
        deliveryFeeInr: breakdown.deliveryFeeInr,
        discountInr: breakdown.discountInr,
        couponCode: coupon?.code ?? null,
        totalInr: breakdown.totalInr,
        giftWrap: Boolean(body.giftWrap),
        insurance: Boolean(body.insurance),
        deliveryMode: body.deliveryMode ?? 'standard',
        vendorName: primaryVendor.name,
        vendorHub: primaryVendor.hub,
        notes: body.notes ?? null,
        items: {
          create: priceItems.map((i) => ({
            productId: i.product.id,
            name: i.product.name,
            vendorName: i.product.vendor.name,
            unit: i.product.unit,
            priceInr: i.priceInr,
            mrpInr: i.mrpInr,
            isRegulated: i.isRegulated,
            quantity: i.quantity,
            accent: i.product.accent,
            glyph: i.product.glyph,
            imageUrl: i.product.imageUrl,
          })),
        },
      },
    });

    if (coupon) {
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { usageCount: { increment: 1 } },
      });
    }

    return NextResponse.json({ ok: true, orderId: order.id });
  } catch (e) {
    console.error('[orders] POST failed:', e);
    return NextResponse.json({ ok: false, error: (e as Error).message || 'Could not place order' }, { status: 500 });
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

  const now = Date.now();
  const projected = orders.map((o) => ({
    ...o,
    status: expectedStatusForElapsed(Math.floor((now - o.placedAt.getTime()) / 1000)),
  }));

  return NextResponse.json({ ok: true, orders: projected });
}
