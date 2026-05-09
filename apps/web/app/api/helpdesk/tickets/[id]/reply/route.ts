import { NextResponse } from 'next/server';
import { getHelpdeskSession } from '@/lib/helpdesk-session';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

/**
 * Helpdesk posts a reply on a ticket. Posting auto-flips the ticket to
 * AWAITING_CUSTOMER (or RESOLVED if resolve=true) and auto-claims it
 * (assigns to this agent) if currently unassigned.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const agent = await getHelpdeskSession();
  if (!agent) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;

  let body: { body?: string; resolve?: boolean };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }

  const text = (body.body ?? '').trim();
  if (text.length < 1 || text.length > 4000) return NextResponse.json({ ok: false, error: 'Message must be 1–4000 characters' }, { status: 400 });

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  if (ticket.status === 'CLOSED') return NextResponse.json({ ok: false, error: 'Ticket is closed' }, { status: 409 });

  const wantsResolve = body.resolve === true;
  const now = new Date();
  const nextStatus = wantsResolve ? 'RESOLVED' : 'AWAITING_CUSTOMER';
  const nextResolvedAt = wantsResolve ? now : null;
  const claim = ticket.assignedAgentId ?? agent.id;

  // SLA bookkeeping. The first time HELPDESK posts on a ticket counts as the
  // first response — record the timestamp and, if it's past due, mark the
  // first-response breach (sticky for analytics). Resolving locks in the
  // resolve breach the same way.
  const isFirstResponse = !ticket.firstResponseAt;
  const firstResponseBreachedNow =
    isFirstResponse && !!ticket.firstResponseDueAt && now > ticket.firstResponseDueAt;
  const resolveBreachedNow =
    wantsResolve && !!ticket.resolveDueAt && now > ticket.resolveDueAt;

  await prisma.$transaction([
    prisma.supportTicketMessage.create({
      data: { ticketId: ticket.id, author: 'HELPDESK', authorName: agent.name, body: text },
    }),
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: nextStatus,
        resolvedAt: nextResolvedAt,
        assignedAgentId: claim,
        firstResponseAt: isFirstResponse ? now : undefined,
        firstResponseBreached: firstResponseBreachedNow ? true : undefined,
        resolveBreached: resolveBreachedNow ? true : undefined,
      },
    }),
  ]);

  logActivity({
    actorRole: 'HELPDESK',
    actorId: agent.id,
    actorName: agent.name,
    action: wantsResolve ? 'TICKET_RESOLVE' : 'TICKET_REPLY',
    summary: `${agent.name} ${wantsResolve ? 'resolved' : 'replied on'} ${ticket.shortCode}`,
    metadata: { ticketId: ticket.id },
  });

  return NextResponse.json({ ok: true });
}
