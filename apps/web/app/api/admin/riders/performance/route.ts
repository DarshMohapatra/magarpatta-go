import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [riders, delivered30, deliveredToday, feedback] = await Promise.all([
    prisma.riderProfile.findMany({
      where: { approvalStatus: 'APPROVED' },
      orderBy: { name: 'asc' },
    }),
    prisma.order.findMany({
      where: { status: 'DELIVERED', deliveredAt: { gte: since }, riderPhone: { not: null } },
      select: {
        riderPhone: true, totalInr: true,
        placedAt: true, vendorAcceptedAt: true, riderAssignedAt: true, pickedUpAt: true, deliveredAt: true,
      },
    }),
    prisma.order.findMany({
      where: { status: 'DELIVERED', deliveredAt: { gte: todayStart }, riderPhone: { not: null } },
      select: { riderPhone: true },
    }),
    prisma.orderFeedback.findMany({
      where: { deliveryRating: { not: null } },
      select: { riderPhone: true, deliveryRating: true },
    }),
  ]);

  const rows = riders.map((r) => {
    const drops = delivered30.filter((o) => o.riderPhone === r.phone);
    const dropsToday = deliveredToday.filter((o) => o.riderPhone === r.phone).length;
    const earnings30 = drops.length * r.perDropInr;
    const ratings = feedback.filter((f) => f.riderPhone === r.phone).map((f) => f.deliveryRating!).filter((n) => typeof n === 'number');
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    // Avg delivery time (pickup → delivered), in minutes
    const pickToDropMs = drops
      .map((o) => (o.pickedUpAt && o.deliveredAt ? o.deliveredAt.getTime() - o.pickedUpAt.getTime() : null))
      .filter((v): v is number => v != null);
    const avgDeliverMin = pickToDropMs.length
      ? Math.round((pickToDropMs.reduce((a, b) => a + b, 0) / pickToDropMs.length) / 60000)
      : 0;

    return {
      id: r.id,
      phone: r.phone,
      name: r.name,
      vehicleType: r.vehicleType,
      vehicleNumber: r.vehicleNumber,
      perDropInr: r.perDropInr,
      onDuty: r.onDuty,
      drops30: drops.length,
      dropsToday,
      earnings30Inr: earnings30,
      ratingCount: ratings.length,
      avgRating: Number(avgRating.toFixed(2)),
      avgDeliverMin,
    };
  });

  rows.sort((a, b) => b.drops30 - a.drops30);
  return NextResponse.json({ ok: true, riders: rows, windowDays: 30 });
}
