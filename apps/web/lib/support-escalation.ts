import 'server-only';
import type {
  SupportTicket,
  SupportEscalationRule,
  EscalationTrigger,
  TicketPriority,
  SupportTeam,
} from '@prisma/client';
import { prisma } from './prisma';

const PRIORITY_RANK: Record<TicketPriority, number> = { LOW: 0, NORMAL: 1, HIGH: 2, URGENT: 3 };

function maxPriority(a: TicketPriority, b: TicketPriority): TicketPriority {
  return PRIORITY_RANK[a] >= PRIORITY_RANK[b] ? a : b;
}

export interface EscalationContext {
  ticket: Pick<SupportTicket,
    | 'id' | 'priority' | 'team' | 'status'
    | 'firstResponseAt' | 'firstResponseDueAt' | 'resolveDueAt'
    | 'updatedAt'
  >;
  now: Date;
  /** Timestamp of the most recent message on the ticket. Used by INACTIVE_TICKET. */
  lastMessageAt: Date | null;
  /** When set, only rules with this trigger fire (used for event-driven calls
   *  like CUSTOMER_REOPEN that shouldn't be picked up by the periodic scan). */
  forceTrigger?: EscalationTrigger;
}

export interface PendingEscalation {
  ruleId: string;
  trigger: EscalationTrigger;
  oldPriority: TicketPriority;
  newPriority: TicketPriority;
  oldTeam: SupportTeam;
  newTeam: SupportTeam | null;
  reason: string;
}

/**
 * Evaluate which escalation rules currently fire for a ticket, simulating
 * sequential application so a chain of rules can compound (e.g. one bumps
 * to HIGH, the next bumps to URGENT).
 *
 * Returns the resulting state plus an array of events the caller should
 * persist with `applyEscalation`.
 */
export async function evaluateEscalation(ctx: EscalationContext): Promise<{
  newPriority: TicketPriority;
  newTeam: SupportTeam;
  events: PendingEscalation[];
}> {
  const rules = await prisma.supportEscalationRule.findMany({ where: { active: true } });

  let priority = ctx.ticket.priority;
  let team     = ctx.ticket.team;
  const events: PendingEscalation[] = [];

  for (const rule of rules) {
    if (ctx.forceTrigger && rule.trigger !== ctx.forceTrigger) continue;
    if (!ctx.forceTrigger && rule.trigger === 'CUSTOMER_REOPEN') continue;
    if (!fires(rule, { ...ctx, ticket: { ...ctx.ticket, priority, team } })) continue;

    const oldPriority = priority;
    const oldTeam     = team;
    if (rule.bumpToPriority) priority = maxPriority(priority, rule.bumpToPriority);
    if (rule.reassignToTeam) team     = rule.reassignToTeam;

    // Don't record a no-op event — if neither priority nor team actually
    // changed, the rule effectively fired but had nothing to do.
    if (priority === oldPriority && team === oldTeam) continue;

    events.push({
      ruleId: rule.id,
      trigger: rule.trigger,
      oldPriority,
      newPriority: priority,
      oldTeam,
      newTeam: team === oldTeam ? null : team,
      reason: `${rule.name} fired (${rule.trigger.toLowerCase().replace(/_/g, ' ')})`,
    });
  }

  return { newPriority: priority, newTeam: team, events };
}

function fires(rule: SupportEscalationRule, ctx: EscalationContext): boolean {
  switch (rule.trigger) {
    case 'FIRST_RESPONSE_OVERDUE': {
      if (ctx.ticket.firstResponseAt) return false;
      if (!ctx.ticket.firstResponseDueAt) return false;
      const at = ctx.ticket.firstResponseDueAt.getTime() + rule.thresholdMinutes * 60_000;
      return ctx.now.getTime() >= at;
    }
    case 'RESOLVE_OVERDUE': {
      if (ctx.ticket.status === 'RESOLVED' || ctx.ticket.status === 'CLOSED') return false;
      if (!ctx.ticket.resolveDueAt) return false;
      const at = ctx.ticket.resolveDueAt.getTime() + rule.thresholdMinutes * 60_000;
      return ctx.now.getTime() >= at;
    }
    case 'CUSTOMER_REOPEN':
      return ctx.forceTrigger === 'CUSTOMER_REOPEN';
    case 'INACTIVE_TICKET': {
      if (ctx.ticket.status === 'RESOLVED' || ctx.ticket.status === 'CLOSED') return false;
      const ref = (ctx.lastMessageAt ?? ctx.ticket.updatedAt).getTime();
      const at  = ref + rule.thresholdMinutes * 60_000;
      return ctx.now.getTime() >= at;
    }
  }
}

/**
 * Persist a set of pending escalations against a ticket: write each event,
 * then update the ticket priority/team/escalationLevel in one transaction.
 * Returns nothing — caller refreshes the ticket from DB if it needs the new
 * state.
 */
export async function applyEscalation(args: {
  ticketId: string;
  events: PendingEscalation[];
  finalPriority: TicketPriority;
  finalTeam: SupportTeam;
}) {
  if (!args.events.length) return;
  await prisma.$transaction([
    prisma.supportEscalationEvent.createMany({
      data: args.events.map((e) => ({
        ticketId:    args.ticketId,
        ruleId:      e.ruleId,
        trigger:     e.trigger,
        oldPriority: e.oldPriority,
        newPriority: e.newPriority,
        oldTeam:     e.oldTeam,
        newTeam:     e.newTeam,
        reason:      e.reason,
      })),
    }),
    prisma.supportTicket.update({
      where: { id: args.ticketId },
      data: {
        priority:        args.finalPriority,
        team:            args.finalTeam,
        escalationLevel: { increment: args.events.length },
      },
    }),
  ]);
}
