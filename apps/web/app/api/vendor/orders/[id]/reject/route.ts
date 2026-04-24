import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (s.approvalStatus !== 'APPROVED') {
    return NextResponse.json({ ok: false, error: 'Shop is not yet approved.' }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  const reason = (body.reason ?? '').trim().slice(0, 200) || 'Vendor could not fulfil';

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  if (order.vendorId !== s.vendorId) {
    return NextResponse.json({ ok: false, error: 'Not your order.' }, { status: 403 });
  }
  if (!['PLACED', 'ACCEPTED'].includes(order.status)) {
    return NextResponse.json({ ok: false, error: 'Too late to reject — order is already in transit.' }, { status: 409 });
  }

  await prisma.order.update({
    where: { id },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
  });

  return NextResponse.json({ ok: true });
}
