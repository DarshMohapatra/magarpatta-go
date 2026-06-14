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
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { select: { id: true, name: true, soldByWeight: true, reconciledAt: true } } },
  });
  if (!order) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  if (order.vendorId !== s.vendorId) {
    return NextResponse.json({ ok: false, error: 'Not your order.' }, { status: 403 });
  }
  if (order.status !== 'ACCEPTED') {
    return NextResponse.json({ ok: false, error: 'Accept the order first.' }, { status: 409 });
  }

  // Block the transition if any soldByWeight item is unreconciled — the
  // vendor must confirm actual weights via /reconcile-weight before the
  // order can move forward, since the total stays estimated until then.
  const unweighed = order.items.filter((it) => it.soldByWeight && !it.reconciledAt);
  if (unweighed.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `Confirm actual weight for: ${unweighed.map((it) => it.name).join(', ')}.`,
        unweighedItemIds: unweighed.map((it) => it.id),
      },
      { status: 409 },
    );
  }

  await prisma.order.update({
    where: { id },
    data: { status: 'PREPARING', vendorReadyAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
