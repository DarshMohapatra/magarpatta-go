import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const since = new Date();
  since.setDate(since.getDate() - 14);

  const delivered = await prisma.order.findMany({
    where: { status: 'DELIVERED', deliveredAt: { gte: since } },
    select: {
      id: true, totalInr: true, subtotalInr: true, deliveryFeeInr: true, discountInr: true,
      deliveredAt: true, vendorName: true, vendorId: true,
    },
  });

  const gmv = delivered.reduce((s, o) => s + o.totalInr, 0);
  const grossMerchandise = delivered.reduce((s, o) => s + o.subtotalInr, 0);
  const deliveryCollected = delivered.reduce((s, o) => s + o.deliveryFeeInr, 0);
  const discountGiven = delivered.reduce((s, o) => s + o.discountInr, 0);

  // Commission payable to platform (15% of subtotal average)
  const vendorIds = [...new Set(delivered.map((o) => o.vendorId).filter(Boolean))] as string[];
  const vendors = await prisma.vendor.findMany({ where: { id: { in: vendorIds } }, select: { id: true, commissionPct: true, name: true } });
  const commissionByVendor = new Map<string, number>();
  const salesByVendor = new Map<string, number>();
  const nameByVendor = new Map<string, string>();
  for (const o of delivered) {
    if (!o.vendorId) continue;
    const v = vendors.find((x) => x.id === o.vendorId);
    if (!v) continue;
    const comm = Math.round((o.subtotalInr * v.commissionPct) / 100);
    commissionByVendor.set(o.vendorId, (commissionByVendor.get(o.vendorId) ?? 0) + comm);
    salesByVendor.set(o.vendorId, (salesByVendor.get(o.vendorId) ?? 0) + o.subtotalInr);
    nameByVendor.set(o.vendorId, v.name);
  }
  const platformCommission = [...commissionByVendor.values()].reduce((a, b) => a + b, 0);

  // By-day series
  const dayMap = new Map<string, { date: string; gmv: number; orders: number }>();
  for (const o of delivered) {
    if (!o.deliveredAt) continue;
    const day = o.deliveredAt.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const cur = dayMap.get(day) ?? { date: day, gmv: 0, orders: 0 };
    cur.gmv += o.totalInr;
    cur.orders += 1;
    dayMap.set(day, cur);
  }
  const byDay = [...dayMap.values()].sort((a, b) => (a.date < b.date ? -1 : 1));

  const vendorRows = [...salesByVendor.entries()].map(([id, sales]) => ({
    vendorId: id,
    vendorName: nameByVendor.get(id) ?? 'Unknown',
    salesInr: sales,
    commissionInr: commissionByVendor.get(id) ?? 0,
  })).sort((a, b) => b.salesInr - a.salesInr);

  return NextResponse.json({
    ok: true,
    gmvInr: gmv,
    grossMerchandiseInr: grossMerchandise,
    deliveryCollectedInr: deliveryCollected,
    discountGivenInr: discountGiven,
    platformCommissionInr: platformCommission,
    byDay,
    vendorRows,
    orderCount: delivered.length,
  });
}
