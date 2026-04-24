import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';

export async function GET() {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const vendor = await prisma.vendor.findUnique({
    where: { id: s.vendorId },
    select: { commissionPct: true },
  });
  const commissionPct = vendor?.commissionPct ?? 15;

  const since = new Date();
  since.setDate(since.getDate() - 14);

  const delivered = await prisma.order.findMany({
    where: { vendorId: s.vendorId, status: 'DELIVERED', deliveredAt: { gte: since } },
    orderBy: { deliveredAt: 'desc' },
    select: {
      id: true, subtotalInr: true, totalInr: true, deliveredAt: true,
      items: { select: { name: true, quantity: true } },
    },
  });

  // Group by day (IST)
  const dayMap = new Map<string, { date: string; orders: number; salesInr: number; commissionInr: number; payoutInr: number }>();
  for (const o of delivered) {
    if (!o.deliveredAt) continue;
    const day = o.deliveredAt.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const cur = dayMap.get(day) ?? { date: day, orders: 0, salesInr: 0, commissionInr: 0, payoutInr: 0 };
    cur.orders += 1;
    cur.salesInr += o.subtotalInr;
    cur.commissionInr = Math.round((cur.salesInr * commissionPct) / 100);
    cur.payoutInr = cur.salesInr - cur.commissionInr;
    dayMap.set(day, cur);
  }
  const byDay = [...dayMap.values()].sort((a, b) => (a.date < b.date ? 1 : -1));

  const totalSales = byDay.reduce((s, d) => s + d.salesInr, 0);
  const totalCommission = Math.round((totalSales * commissionPct) / 100);
  const totalPayout = totalSales - totalCommission;

  return NextResponse.json({
    ok: true,
    commissionPct,
    totalSalesInr: totalSales,
    totalCommissionInr: totalCommission,
    totalPayoutInr: totalPayout,
    byDay,
    recentOrders: delivered.slice(0, 20),
  });
}
