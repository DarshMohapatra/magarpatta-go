import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';

/**
 * Vendor-facing settlement view. Returns the rows the platform has computed
 * for this vendor:
 *   - payable: PAYABLE rows, newest first — money the platform owes them
 *   - history: PAID rows in the last 90 days — record of money already sent
 *
 * The settlement totals are authoritative; we don't re-sum delivered orders
 * here because doing so would drift away from what admin is paying out.
 */
export async function GET() {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const historyCutoff = new Date();
  historyCutoff.setDate(historyCutoff.getDate() - 90);

  const [vendor, payable, history] = await Promise.all([
    prisma.vendor.findUnique({
      where: { id: s.vendorId },
      select: { commissionPct: true, upiId: true, bankAccountNumber: true, bankIfsc: true, bankAccountName: true },
    }),
    prisma.vendorSettlement.findMany({
      where: { vendorId: s.vendorId, status: 'PAYABLE' },
      orderBy: [{ periodStart: 'desc' }],
    }),
    prisma.vendorSettlement.findMany({
      where: { vendorId: s.vendorId, status: 'PAID', paidAt: { gte: historyCutoff } },
      orderBy: [{ paidAt: 'desc' }],
      take: 100,
    }),
  ]);

  const totalPayableInr = payable.reduce((sum, r) => sum + r.payableInr, 0);
  const totalGrossInr = payable.reduce((sum, r) => sum + r.grossInr, 0);
  const totalCommissionInr = payable.reduce((sum, r) => sum + r.commissionInr, 0);
  const paidLast90Inr = history.reduce((sum, r) => sum + r.payableInr, 0);

  return NextResponse.json({
    ok: true,
    commissionPct: vendor?.commissionPct ?? 15,
    bankSnapshot: vendor
      ? {
          upiId: vendor.upiId,
          bankAccountName: vendor.bankAccountName,
          // Only the last 4 of the account number — vendor knows their own
          // account, this is just a "yes we have it on file" confirmation.
          accountLast4: vendor.bankAccountNumber ? vendor.bankAccountNumber.slice(-4) : null,
          bankIfsc: vendor.bankIfsc,
        }
      : null,
    payable,
    history,
    totals: {
      totalPayableInr,
      totalGrossInr,
      totalCommissionInr,
      paidLast90Inr,
      payableCount: payable.length,
    },
  });
}
