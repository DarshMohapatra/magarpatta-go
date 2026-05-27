import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

/**
 * Admin view of vendor settlements. Returns two lists: PAYABLE rows
 * (currently owed) and a 90-day window of PAID rows (history). Each list
 * carries enough vendor metadata for the admin to action on the row
 * without a second fetch.
 */
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'OPS' && admin.role !== 'FINANCE') {
    return NextResponse.json({ ok: false, error: 'Insufficient permission' }, { status: 403 });
  }

  const historyCutoff = new Date();
  historyCutoff.setDate(historyCutoff.getDate() - 90);

  const [payable, paid] = await Promise.all([
    prisma.vendorSettlement.findMany({
      where: { status: 'PAYABLE' },
      orderBy: [{ periodStart: 'desc' }],
      include: { vendor: { select: { id: true, name: true, slug: true, upiId: true, bankAccountNumber: true, bankIfsc: true, ownerPhone: true } } },
    }),
    prisma.vendorSettlement.findMany({
      where: { status: 'PAID', paidAt: { gte: historyCutoff } },
      orderBy: [{ paidAt: 'desc' }],
      take: 200,
      include: { vendor: { select: { id: true, name: true, slug: true } } },
    }),
  ]);

  const totals = {
    payableCount: payable.length,
    payableInr: payable.reduce((s, r) => s + r.payableInr, 0),
    paidCountLast90: paid.length,
    paidInrLast90: paid.reduce((s, r) => s + r.payableInr, 0),
  };

  return NextResponse.json({ ok: true, payable, paid, totals });
}
