import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public read — same response for every visitor. Cache aggressively at the
// edge so repeat menu visits don't hammer the DB.
export const revalidate = 30;

export async function GET() {
  const now = new Date();
  const campaigns = await prisma.campaign.findMany({
    where: {
      approvalStatus: 'APPROVED',
      active: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
      vendor: { active: true, approvalStatus: 'APPROVED' },
    },
    orderBy: [{ endsAt: 'asc' }],
    take: 5,
    include: {
      vendor: { select: { id: true, slug: true, name: true, hub: true } },
    },
  });

  return NextResponse.json(
    { ok: true, campaigns },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    },
  );
}
