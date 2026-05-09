import { notFound, redirect } from 'next/navigation';
import { getHelpdeskSession } from '@/lib/helpdesk-session';
import { prisma } from '@/lib/prisma';
import { HelpdeskShell } from '@/components/helpdesk/helpdesk-shell';
import { HelpdeskTicketClient } from './ticket-client';

export const dynamic = 'force-dynamic';

export default async function HelpdeskTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const agent = await getHelpdeskSession();
  if (!agent) redirect('/helpdesk/signin');
  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      order: { select: { id: true, vendorName: true, totalInr: true, placedAt: true, status: true } },
      messages: { orderBy: { createdAt: 'asc' } },
      assignedAgent: { select: { id: true, name: true } },
      escalationEvents: { orderBy: { occurredAt: 'desc' } },
    },
  });
  if (!ticket) notFound();

  return (
    <HelpdeskShell name={agent.name}>
      <HelpdeskTicketClient
        ticket={{
          id: ticket.id,
          shortCode: ticket.shortCode,
          subject: ticket.subject,
          category: ticket.category,
          status: ticket.status,
          priority: ticket.priority,
          channel: ticket.channel,
          team: ticket.team,
          escalationLevel: ticket.escalationLevel,
          firstResponseAt: ticket.firstResponseAt?.toISOString() ?? null,
          firstResponseDueAt: ticket.firstResponseDueAt?.toISOString() ?? null,
          firstResponseBreached: ticket.firstResponseBreached,
          resolveDueAt: ticket.resolveDueAt?.toISOString() ?? null,
          resolveBreached: ticket.resolveBreached,
          createdAt: ticket.createdAt.toISOString(),
          resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
          user: ticket.user,
          order: ticket.order ? { ...ticket.order, placedAt: ticket.order.placedAt.toISOString() } : null,
          assignedAgent: ticket.assignedAgent,
          messages: ticket.messages.map((m) => ({
            id: m.id, author: m.author, authorName: m.authorName,
            body: m.body, createdAt: m.createdAt.toISOString(),
          })),
          escalationEvents: ticket.escalationEvents.map((e) => ({
            id: e.id, trigger: e.trigger,
            oldPriority: e.oldPriority, newPriority: e.newPriority,
            oldTeam: e.oldTeam, newTeam: e.newTeam,
            reason: e.reason, occurredAt: e.occurredAt.toISOString(),
          })),
        }}
      />
    </HelpdeskShell>
  );
}
