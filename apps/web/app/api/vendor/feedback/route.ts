import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';

export async function GET() {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const feedback = await prisma.orderFeedback.findMany({
    where: { vendorId: s.vendorId, foodRating: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      order: {
        select: {
          id: true, totalInr: true, placedAt: true,
          items: { select: { name: true, quantity: true } },
        },
      },
    },
  });

  const ratings = feedback.map((f) => f.foodRating!).filter((n) => typeof n === 'number');
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
