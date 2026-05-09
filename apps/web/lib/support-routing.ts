import 'server-only';
import type { TicketCategory, TicketChannel, SupportTeam } from '@prisma/client';
import { prisma } from './prisma';

export interface RoutingInput {
  category: TicketCategory;
  channel: TicketChannel;
  hasOrder: boolean;
  subjectAndBody: string;
}

export interface RoutingMatch {
  category?: TicketCategory;
  channel?: TicketChannel;
  hasOrder?: boolean;
  keywordsAny?: string[];
}

export interface RoutingAction {
  team?: SupportTeam;
  agentId?: string;
  strategy?: 'ROUND_ROBIN' | 'LEAST_BUSY';
}

export interface RoutingDecision {
  team: SupportTeam;
  assignedAgentId: string | null;
  matchedRuleId: string | null;
}

// Sensible defaults so a brand-new instance routes to the right team even
// before an admin has configured any rules.
const CATEGORY_DEFAULT_TEAM: Record<TicketCategory, SupportTeam> = {
  WRONG_ITEM:      'VENDOR_OPS',
  MISSING_ITEM:    'VENDOR_OPS',
  QUALITY:         'VENDOR_OPS',
  LATE_DELIVERY:   'RIDER_OPS',
  RIDER_BEHAVIOUR: 'RIDER_OPS',
  PAYMENT:         'BILLING',
  REFUND:          'BILLING',
  ACCOUNT:         'GENERAL',
  OTHER:           'GENERAL',
};

export async function decideRouting(input: RoutingInput): Promise<RoutingDecision> {
  const rules = await prisma.supportRoutingRule.findMany({
    where: { active: true },
    orderBy: { priority: 'asc' },
  });

  const lowerText = input.subjectAndBody.toLowerCase();

  for (const rule of rules) {
    const m = (rule.match ?? {}) as RoutingMatch;
    if (m.category    && m.category   !== input.category) continue;
    if (m.channel     && m.channel    !== input.channel)  continue;
    if (m.hasOrder !== undefined && m.hasOrder !== input.hasOrder) continue;
    if (m.keywordsAny?.length) {
      const hit = m.keywordsAny.some((k) => lowerText.includes(k.toLowerCase()));
      if (!hit) continue;
    }

    const a = (rule.action ?? {}) as RoutingAction;
    const team = a.team ?? CATEGORY_DEFAULT_TEAM[input.category];
    const assignedAgentId = await pickAgent({ team, agentId: a.agentId, strategy: a.strategy });
    return { team, assignedAgentId, matchedRuleId: rule.id };
  }

  // No rule matched — derive team from category, leave agent unassigned so
  // whoever is on shift in that team picks it up from the queue.
  return {
    team: CATEGORY_DEFAULT_TEAM[input.category],
    assignedAgentId: null,
    matchedRuleId: null,
  };
}

async function pickAgent(args: {
  team: SupportTeam;
  agentId?: string;
  strategy?: RoutingAction['strategy'];
}): Promise<string | null> {
  if (args.agentId) {
    const ok = await prisma.supportAgent.findFirst({
      where: { id: args.agentId, active: true },
      select: { id: true },
    });
    if (ok) return ok.id;
    // Specified agent missing/inactive — fall through to strategy-based pick.
  }

  // An agent with empty `teams` is treated as a generalist — eligible for
  // every team's queue. This matches how a 4-person helpdesk actually runs.
  const eligibleWhere = {
    active: true,
    OR: [{ teams: { has: args.team } }, { teams: { isEmpty: true } }],
  };

  if (args.strategy === 'LEAST_BUSY') {
    const agents = await prisma.supportAgent.findMany({
      where: eligibleWhere,
      select: {
        id: true,
        _count: {
          select: {
            assignedTickets: {
              where: { status: { in: ['OPEN', 'IN_REVIEW', 'AWAITING_CUSTOMER'] } },
            },
          },
        },
      },
    });
    if (!agents.length) return null;
    agents.sort((a, b) => a._count.assignedTickets - b._count.assignedTickets);
    return agents[0].id;
  }

  if (args.strategy === 'ROUND_ROBIN') {
    // Simple round-robin: pick the agent whose most-recent assignment is
    // oldest (i.e. has been waiting longest for a new ticket).
    const agents = await prisma.supportAgent.findMany({
      where: eligibleWhere,
      select: {
        id: true,
        assignedTickets: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });
    if (!agents.length) return null;
    agents.sort((a, b) => {
      const at = a.assignedTickets[0]?.createdAt.getTime() ?? 0;
      const bt = b.assignedTickets[0]?.createdAt.getTime() ?? 0;
      return at - bt;
    });
    return agents[0].id;
  }

  // No strategy specified — leave it on the team queue.
  return null;
}

export const CATEGORY_TEAM_DEFAULTS = CATEGORY_DEFAULT_TEAM;
