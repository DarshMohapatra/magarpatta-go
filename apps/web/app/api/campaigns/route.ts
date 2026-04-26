import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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
    orderBy: [{ startsAt: 'desc' }],
    include: {
      vendor: { select: { id: true, slug: true, name: true, hub: true } },
    },
  });
  return NextResponse.json({ ok: true, campaigns });
}
