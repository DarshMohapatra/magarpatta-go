import { NextResponse } from 'next/server';
import { getCustomerScope } from '@/lib/customer-scope';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';
import { evaluateEscalation, applyEscalation } from '@/lib/support-escalation';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const scope = await getCustomerScope();
  if (!scope) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;

  const ticket = await prisma.supportTicket.findFirst({
    where: { id, userId: scope.userId },
    include: {
      order: { select: { id: true, totalInr: true, vendorName: true, placedAt: true } },
      messages: { orderBy: { createdAt: 'asc' } },
      assignedAgent: { select: { name: true } },
    },
  });
  if (!ticket) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  return NextResponse.json({ ok: true, ticket });
}

/**
 * Customer adds a reply to their own ticket. Adding a reply also flips a
 * RESOLVED ticket back to IN_REVIEW (re-open) and an AWAITING_CUSTOMER
 * ticket back to IN_REVIEW.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const scope = await getCustomerScope();
  if (!scope) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;

  let body: { body?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }

  const text = (body.body ?? '').trim();
  if (text.length < 1 || text.length > 4000) return NextResponse.json({ ok: false, error: 'Message must be 1–4000 characters' }, { status: 400 });

  const ticket = await prisma.supportTicket.findFirst({ where: { id, userId: scope.userId } });
  if (!ticket) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  if (ticket.status === 'CLOSED') return NextResponse.json({ ok: false, error: 'This ticket is closed' }, { status: 409 });

  const customerName = scope.session.name ?? `+91 ${scope.session.phone}`;
  const isReopen = ticket.status === 'RESOLVED';
  const nextStatus = ticket.status === 'OPEN' ? 'OPEN' : 'IN_REVIEW';
  const now = new Date();

  await prisma.$transaction([
    prisma.supportTicketMessage.create({
      data: { ticketId: ticket.id, author: 'CUSTOMER', authorName: customerName, body: text },
    }),
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: nextStatus,
        resolvedAt: nextStatus === 'IN_REVIEW' ? null : ticket.resolvedAt,
        lastReopenedAt: isReopen ? now : ticket.lastReopenedAt,
      },
    }),
  ]);

  // A reopen is the canonical CUSTOMER_REOPEN escalation trigger — fire any
  // matching rules now (priority bump, team reassign) so the ticket lands in
  // the right queue immediately rather than at the next cron tick.
  if (isReopen) {
    const fresh = await prisma.supportTicket.findUnique({
      where: { id: ticket.id },
      select: {
        id: true, priority: true, team: true, status: true,
        firstResponseAt: true, firstResponseDueAt: true, resolveDueAt: true, updatedAt: true,
      },
    });
    if (fresh) {
      const result = await evaluateEscalation({
        ticket: fresh,
        now,
        lastMessageAt: now,
        forceTrigger: 'CUSTOMER_REOPEN',
      });
      if (result.events.length) {
        await applyEscalation({
          ticketId: fresh.id,
          events: result.events,
          finalPriority: result.newPriority,
          finalTeam:     result.newTeam,
        });
      }
    }
  }

  logActivity({
    actorRole: 'CUSTOMER',
    actorId: scope.userId,
    actorName: customerName,
    action: isReopen ? 'TICKET_REOPEN' : 'TICKET_REPLY',
    summary: `${customerName} ${isReopen ? 're-opened' : 'replied on'} ${ticket.shortCode}`,
    metadata: { ticketId: ticket.id },
  });

  return NextResponse.json({ ok: true });
}
