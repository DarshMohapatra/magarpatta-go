import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';
import { deliveryOtp } from '@/lib/orders';

/**
 * Vendor-self-delivery: vendor hands over at the customer's door and marks
 * delivered. OTP check identical to the rider flow — the customer reads the
 * 4-digit code aloud, vendor types it here.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (s.approvalStatus !== 'APPROVED') {
    return NextResponse.json({ ok: false, error: 'Shop is not yet approved.' }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { otp?: string };
  const otp = (body.otp ?? '').replace(/\D/g, '').slice(0, 4);

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  if (order.vendorId !== s.vendorId) return NextResponse.json({ ok: false, error: 'Not your order.' }, { status: 403 });
  if (order.fulfilmentMode !== 'VENDOR_SELF') {
    return NextResponse.json({ ok: false, error: 'This order is handled by a platform rider.' }, { status: 409 });
  }
  if (otp !== deliveryOtp(order.id)) {
    return NextResponse.json({ ok: false, error: 'Wrong OTP. Ask the customer to check their order page.' }, { status: 400 });
  }

  await prisma.order.update({
    where: { id },
    data: { status: 'DELIVERED', deliveredAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
