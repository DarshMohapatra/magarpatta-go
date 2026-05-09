import { NextResponse } from 'next/server';
import type { DeviationAlertStatus } from '@prisma/client';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const OPEN_STATUSES: DeviationAlertStatus[] = ['OPEN', 'AWAITING_RIDER', 'UNDER_REVIEW'];

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const url = new URL(req.url);
  const scope = url.searchParams.get('scope') ?? 'open';

  let where: { status?: DeviationAlertStatus | { in: DeviationAlertStatus[] } } = {};
  if      (scope === 'open')      where.status = { in: OPEN_STATUSES };
  else if (scope === 'resolved')  where.status = 'RESOLVED';
  else if (scope === 'dismissed') where.status = 'DISMISSED';
  // scope=all → no filter

  const [alerts, counts] = await Promise.all([
    prisma.riderDeviationAlert.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }],
      take: 200,
      include: {
        rider: { select: { id: true, name: true, phone: true, hub: { select: { name: true } } } },
        order: { select: { id: true, vendorName: true, society: true, building: true, status: true } },
      },
    }),
    Promise.all([
      prisma.riderDeviationAlert.count({ where: { status: { in: OPEN_STATUSES } } }),
      prisma.riderDeviationAlert.count({ where: { status: 'RESOLVED' } }),
      prisma.riderDeviationAlert.count({ where: { status: 'DISMISSED' } }),
    ]).then(([open, resolved, dismissed]) => ({ open, resolved, dismissed })),
  ]);

  return NextResponse.json({ ok: true, alerts, counts });
}
