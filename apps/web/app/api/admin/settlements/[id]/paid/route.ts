import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

/**
 * Mark a settlement as PAID. Records the admin who actioned the row and a
 * payment reference (UPI txn id, IMPS UTR, NEFT reference — whatever the
 * finance team typed into the bank UI). Once paid, the row drops out of
 * the PAYABLE list and joins the 90-day history.
 *
 * Rejects double-mark (status === 'PAID') so an accidental second click
 * can't clobber the original paymentRef / paidAt fields.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'FINANCE') {
    return NextResponse.json({ ok: false, error: 'Insufficient permission' }, { status: 403 });
  }

  const { id } = await params;
  let body: { paymentRef?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const paymentRef = (body.paymentRef ?? '').trim();
  if (!paymentRef) {
    return NextResponse.json({ ok: false, error: 'Payment reference is required (UPI txn id / UTR / NEFT ref).' }, { status: 400 });
  }
  if (paymentRef.length > 128) {
    return NextResponse.json({ ok: false, error: 'Payment reference is too long.' }, { status: 400 });
  }

  const existing = await prisma.vendorSettlement.findUnique({ where: { id }, select: { status: true } });
  if (!existing) return NextResponse.json({ ok: false, error: 'Settlement not found' }, { status: 404 });
  if (existing.status === 'PAID') {
    return NextResponse.json({ ok: false, error: 'This settlement is already marked as paid.' }, { status: 409 });
  }

  const updated = await prisma.vendorSettlement.update({
    where: { id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      paidByAdminId: admin.id,
      paymentRef,
      notes: body.notes?.trim() || null,
    },
  });

  await prisma.activityLog.create({
    data: {
      actorRole: 'ADMIN',
      actorId: admin.id,
      actorName: admin.name,
      action: 'SETTLEMENT_PAID',
      summary: `${admin.name} marked settlement ${id.slice(-6)} (₹${updated.payableInr}) as paid`,
      metadata: { settlementId: id, vendorId: updated.vendorId, payableInr: updated.payableInr, paymentRef },
    },
  });

  return NextResponse.json({ ok: true, settlement: updated });
}
