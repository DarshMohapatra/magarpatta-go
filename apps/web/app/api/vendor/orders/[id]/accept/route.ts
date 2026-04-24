import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (s.approvalStatus !== 'APPROVED') {
    return NextResponse.json({ ok: false, error: 'Shop is not yet approved.' }, { status: 403 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  if (order.vendorId !== s.vendorId) {
    return NextResponse.json({ ok: false, error: 'Not your order.' }, { status: 403 });
  }
  if (order.status !== 'PLACED') {
    return NextResponse.json({ ok: false, error: `Order is already ${order.status.toLowerCase()}.` }, { status: 409 });
  }

  const now = new Date();
  await prisma.order.update({
    where: { id },
    data: { status: 'ACCEPTED', vendorAcceptedAt: now, acceptedAt: now },
  });

  return NextResponse.json({ ok: true });
}
