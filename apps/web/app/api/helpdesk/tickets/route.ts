import { NextResponse } from 'next/server';
import type { TicketStatus, TicketChannel, SupportTeam } from '@prisma/client';
import { getHelpdeskSession } from '@/lib/helpdesk-session';
import { prisma } from '@/lib/prisma';
import { isTicketStatus, isTicketChannel, isSupportTeam } from '@/lib/support-tickets';

export const dynamic = 'force-dynamic';

const OPEN_STATUSES: TicketStatus[] = ['OPEN', 'IN_REVIEW', 'AWAITING_CUSTOMER'];

export async function GET(req: Request) {
  const agent = await getHelpdeskSession();
  if (!agent) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const url = new URL(req.url);
  const scope = url.searchParams.get('scope') ?? 'open';
  const statusParam  = url.searchParams.get('status');
  const channelParam = url.searchParams.get('channel');
  const teamParam    = url.searchParams.get('team');

  const where: {
    status?:  TicketStatus | { in: TicketStatus[] };
    channel?: TicketChannel;
    team?:    SupportTeam;
  } = {};
  if (isTicketStatus(statusParam)) where.status = statusParam;
  else if (scope === 'open')      where.status = { in: OPEN_STATUSES };
  else if (scope === 'resolved')  where.status = 'RESOLVED';
  else if (scope === 'closed')    where.status = 'CLOSED';
  if (isTicketChannel(channelParam)) where.channel = channelParam;
  if (isSupportTeam(teamParam))      where.team    = teamParam;

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
