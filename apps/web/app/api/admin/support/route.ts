import { NextResponse } from 'next/server';
import type { TicketStatus } from '@prisma/client';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import { isTicketStatus } from '@/lib/support-tickets';

export const dynamic = 'force-dynamic';

const OPEN_STATUSES: TicketStatus[] = ['OPEN', 'IN_REVIEW', 'AWAITING_CUSTOMER'];

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const url = new URL(req.url);
  const scope = url.searchParams.get('scope') ?? 'open';
  const statusParam = url.searchParams.get('status');

  let where: { status?: TicketStatus | { in: TicketStatus[] } } = {};
  if (isTicketStatus(statusParam)) where.status = statusParam;
  else if (scope === 'open')      where.status = { in: OPEN_STATUSES };
  else if (scope === 'resolved')  where.status = 'RESOLVED';
  else if (scope === 'closed')    where.status = 'CLOSED';
  // scope === 'all' → no filter

  const [tickets, counts] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 200,
      include: {
        user: { select: { name: true, phone: true } },
        order: { select: { id: true, totalInr: true, vendorName: true } },
        assignedAgent: { select: { name: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { author: true, body: true, createdAt: true } },
      },
    }),
    Promise.all([
      prisma.supportTicket.count({ where: { status: { in: OPEN_STATUSES } } }),
      prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      prisma.supportTicket.count({ where: { status: 'CLOSED' } }),
    ]).then(([open, resolved, closed]) => ({ open, resolved, closed })),
  ]);

  return NextResponse.json({ ok: true, tickets, counts });
}
