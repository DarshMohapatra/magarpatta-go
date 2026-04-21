import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { code, subtotalInr } = (await req.json()) as { code: string; subtotalInr: number };
    if (!code || typeof subtotalInr !== 'number') {
      return NextResponse.json({ ok: false, error: 'code + subtotalInr required' }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } });
    if (!coupon || !coupon.active) {
      return NextResponse.json({ ok: false, error: 'Invalid coupon' }, { status: 404 });
    }
    if (coupon.validUntil && coupon.validUntil < new Date()) {
      return NextResponse.json({ ok: false, error: 'This coupon has expired' }, { status: 400 });
    }
    if (subtotalInr < coupon.minSubtotalInr) {
      return NextResponse.json({
        ok: false,
        error: `Add ₹${coupon.minSubtotalInr - subtotalInr} more to use this coupon`,
      }, { status: 400 });
    }

    // Calculate preview
    let discount = 0;
    let freeDelivery = false;
    if (coupon.type === 'PERCENT' && coupon.percentOff) {
      discount = Math.round((subtotalInr * coupon.percentOff) / 100);
      if (coupon.maxDiscountInr) discount = Math.min(discount, coupon.maxDiscountInr);
    } else if (coupon.type === 'FLAT' && coupon.flatOffInr) {
      discount = coupon.flatOffInr;
    } else if (coupon.type === 'FREE_DELIVERY') {
      freeDelivery = true;
    }

    return NextResponse.json({
      ok: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        percentOff: coupon.percentOff,
        flatOffInr: coupon.flatOffInr,
        minSubtotalInr: coupon.minSubtotalInr,
        maxDiscountInr: coupon.maxDiscountInr,
      },
      preview: { discountInr: discount, freeDelivery },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}

export async function GET() {
  const coupons = await prisma.coupon.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    select: { code: true, description: true, type: true, minSubtotalInr: true, percentOff: true, flatOffInr: true, maxDiscountInr: true },
  });
  return NextResponse.json({ coupons });
}
