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

  // The PENDING tab also surfaces campaigns the vendor has flagged for
  // removal — admin handles edits, new submissions, and removals from one
  // place.
  const where = status === 'PENDING'
    ? { OR: [{ approvalStatus: 'PENDING' as const }, { pendingRemoval: true }] }
    : { approvalStatus: status, pendingRemoval: false };

  const [campaigns, approvalCounts, removalCount] = await Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      include: { vendor: { select: { id: true, name: true, slug: true, hub: true } } },
    }),
    prisma.campaign.groupBy({ by: ['approvalStatus'], _count: true }),
    prisma.campaign.count({ where: { pendingRemoval: true, approvalStatus: { not: 'PENDING' } } }),
  ]);

  // Roll the standalone "removal-pending but already-approved" campaigns into
  // the PENDING tab count so the badge reflects everything that needs review.
  const counts = approvalCounts.map((c) =>
    c.approvalStatus === 'PENDING' ? { ...c, _count: c._count + removalCount } : c,
  );
  if (!counts.some((c) => c.approvalStatus === 'PENDING') && removalCount > 0) {
    counts.push({ approvalStatus: 'PENDING', _count: removalCount });
  }

  return NextResponse.json({ ok: true, campaigns, counts, status });
}
