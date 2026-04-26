import { NextResponse } from 'next/server';
import type { CampaignApprovalStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

const VALID: CampaignApprovalStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const url = new URL(req.url);
  const statusParam = url.searchParams.get('status');
  const status = (VALID.includes(statusParam as CampaignApprovalStatus)
    ? statusParam
    : 'PENDING') as CampaignApprovalStatus;

  const [campaigns, counts] = await Promise.all([
    prisma.campaign.findMany({
      where: { approvalStatus: status },
      orderBy: { submittedAt: 'desc' },
      include: { vendor: { select: { id: true, name: true, slug: true, hub: true } } },
    }),
    prisma.campaign.groupBy({ by: ['approvalStatus'], _count: true }),
  ]);

  return NextResponse.json({ ok: true, campaigns, counts, status });
}
