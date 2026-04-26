import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const now = new Date();
  // Surface the 5 closest-to-ending so flash sales and late-night deals
  // surface ahead of evergreen promos.
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
  return NextResponse.json({ ok: true, campaigns });
}
