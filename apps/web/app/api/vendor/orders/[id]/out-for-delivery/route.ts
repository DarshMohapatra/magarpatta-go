import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';

/**
 * Vendor-self-delivery: vendor leaves the shop with the order. Sets
 * pickedUpAt so the customer tracker shows "on the way", and marks status
 * OUT_FOR_DELIVERY directly (skipping rider assignment).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (s.approvalStatus !== 'APPROVED') {
    return NextResponse.json({ ok: false, error: 'Shop is not yet approved.' }, { status: 403 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  if (order.vendorId !== s.vendorId) return NextResponse.json({ ok: false, error: 'Not your order.' }, { status: 403 });
  if (order.fulfilmentMode !== 'VENDOR_SELF') {
    return NextResponse.json({ ok: false, error: 'This order is handled by a platform rider.' }, { status: 409 });
  }
  if (!['ACCEPTED', 'PREPARING'].includes(order.status)) {
    return NextResponse.json({ ok: false, error: `Order is ${order.status.toLowerCase()}.` }, { status: 409 });
  }

  const now = new Date();
  await prisma.order.update({
    where: { id },
    data: {
      status: 'OUT_FOR_DELIVERY',
      vendorReadyAt: order.vendorReadyAt ?? now,
      pickedUpAt: order.pickedUpAt ?? now,
    },
  });

  return NextResponse.json({ ok: true });
}
