import { NextResponse } from 'next/server';
import type { SupportTeam } from '@prisma/client';
import { getHelpdeskSession } from '@/lib/helpdesk-session';
import { prisma } from '@/lib/prisma';
import { isTicketCategory, isTicketPriority, isTicketStatus, isSupportTeam } from '@/lib/support-tickets';
import { logActivity } from '@/lib/activity-log';
import { recomputeSlaForChange } from '@/lib/sla';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const agent = await getHelpdeskSession();
  if (!agent) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      order: { select: { id: true, totalInr: true, vendorName: true, placedAt: true, status: true } },
      messages: { orderBy: { createdAt: 'asc' } },
      assignedAgent: { select: { id: true, name: true } },
    },
  });
  if (!ticket) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  return NextResponse.json({ ok: true, ticket });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const agent = await getHelpdeskSession();
  if (!agent) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;

  let body: { status?: string; priority?: string; category?: string; team?: string; assignedAgentId?: string | null };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  const data: {
    status?: typeof ticket.status;
    priority?: typeof ticket.priority;
    category?: typeof ticket.category;
    team?: SupportTeam;
    assignedAgentId?: string | null;
    resolvedAt?: Date | null;
    resolveBreached?: boolean;
    slaPolicyId?: string | null;
    firstResponseDueAt?: Date;
    resolveDueAt?: Date;
  } = {};
  const changes: string[] = [];

  if (body.status !== undefined) {
    if (!isTicketStatus(body.status)) return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 });
    data.status = body.status;
    const now = new Date();
    if (body.status === 'RESOLVED' || body.status === 'CLOSED') {
      data.resolvedAt = ticket.resolvedAt ?? now;
      // Mark resolve breach the first time we land in a terminal state past due.
      if (!ticket.resolveBreached && ticket.resolveDueAt && now > ticket.resolveDueAt) {
        data.resolveBreached = true;
      }
    }
    if (body.status !== 'RESOLVED' && body.status !== 'CLOSED') data.resolvedAt = null;
    changes.push(`status → ${body.status}`);
  }
  if (body.priority !== undefined) {
    if (!isTicketPriority(body.priority)) return NextResponse.json({ ok: false, error: 'Invalid priority' }, { status: 400 });
    data.priority = body.priority;
    changes.push(`priority → ${body.priority}`);
  }
  if (body.category !== undefined) {
    if (!isTicketCategory(body.category)) return NextResponse.json({ ok: false, error: 'Invalid category' }, { status: 400 });
    data.category = body.category;
    changes.push(`category → ${body.category}`);
  }
  if (body.team !== undefined) {
    if (!isSupportTeam(body.team)) return NextResponse.json({ ok: false, error: 'Invalid team' }, { status: 400 });
    data.team = body.team;
    changes.push(`team → ${body.team}`);
  }
  if (body.assignedAgentId !== undefined) {
    if (body.assignedAgentId !== null) {
      const exists = await prisma.supportAgent.findUnique({ where: { id: body.assignedAgentId }, select: { id: true } });
      if (!exists) return NextResponse.json({ ok: false, error: 'Agent not found' }, { status: 400 });
    }
    data.assignedAgentId = body.assignedAgentId;
    changes.push(body.assignedAgentId ? 'assigned' : 'unassigned');
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ ok: false, error: 'No changes' }, { status: 400 });

  // Re-resolve SLA targets when priority OR team changes — the new policy
  // may set tighter / looser windows. firstResponseDueAt only slides if the
  // first response hasn't been recorded yet (preserves analytics).
  if (data.priority !== undefined || data.team !== undefined) {
    const sla = await recomputeSlaForChange({
      ticketCreatedAt: ticket.createdAt,
      newPriority: data.priority ?? ticket.priority,
      newTeam:     data.team     ?? ticket.team,
      hadFirstResponse: !!ticket.firstResponseAt,
    });
    data.slaPolicyId  = sla.policyId;
    data.resolveDueAt = sla.resolveDueAt;
    if (sla.firstResponseDueAt) data.firstResponseDueAt = sla.firstResponseDueAt;
  }

  await prisma.supportTicket.update({ where: { id }, data });

  logActivity({
    actorRole: 'HELPDESK',
    actorId: agent.id,
    actorName: agent.name,
    action: 'TICKET_UPDATE',
    summary: `${agent.name} updated ${ticket.shortCode}: ${changes.join(', ')}`,
    metadata: { ticketId: id, changes: data },
  });

  return NextResponse.json({ ok: true });
}
