import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRiderSession } from '@/lib/rider-session';

export async function GET() {
  const s = await getRiderSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const feedback = await prisma.orderFeedback.findMany({
    where: { riderPhone: s.phone, deliveryRating: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      order: {
        select: {
          id: true, placedAt: true, deliveredAt: true, vendorName: true,
          building: true, society: true,
        },
      },
    },
  });

  const ratings = feedback.map((f) => f.deliveryRating!).filter((n) => typeof n === 'number');
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const dist = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: ratings.filter((r) => r === star).length,
  }));

  return NextResponse.json({
    ok: true,
    feedback,
    stats: { count: ratings.length, avg: Number(avg.toFixed(2)), distribution: dist },
  });
}
