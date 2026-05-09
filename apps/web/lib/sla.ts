import 'server-only';
import type { SupportSlaPolicy, TicketPriority, SupportTeam } from '@prisma/client';
import { prisma } from './prisma';

export interface SlaTargets {
  policyId: string | null;
  firstResponseDueAt: Date;
  resolveDueAt: Date;
}

// Fallback targets, used when no SupportSlaPolicy row matches a ticket.
// Keep them sane for a 4-rider hyper-local op — generous on LOW/NORMAL,
// tight on URGENT so a real fire actually feels like one.
const DEFAULTS_BY_PRIORITY: Record<TicketPriority, { firstResponseMinutes: number; resolveMinutes: number }> = {
  URGENT: { firstResponseMinutes: 15,  resolveMinutes: 60 * 4  },
  HIGH:   { firstResponseMinutes: 60,  resolveMinutes: 60 * 8  },
  NORMAL: { firstResponseMinutes: 240, resolveMinutes: 60 * 24 },
  LOW:    { firstResponseMinutes: 480, resolveMinutes: 60 * 48 },
};

/**
 * Resolve the SLA policy that applies to a ticket. Most-specific match wins:
 * (priority + team) > priority > team > catch-all. Ties go to the policy
 * created most recently — so an admin can override a stale rule by creating
 * a new one without having to delete the old.
 */
export async function resolveSlaPolicy({
  priority,
  team,
}: {
  priority: TicketPriority;
  team: SupportTeam;
}): Promise<SupportSlaPolicy | null> {
  const candidates = await prisma.supportSlaPolicy.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });

  let best: { score: number; policy: SupportSlaPolicy } | null = null;
  for (const p of candidates) {
    if (p.priority !== null && p.priority !== priority) continue;
    if (p.team     !== null && p.team     !== team)     continue;
    const score = (p.priority === priority ? 2 : 0) + (p.team === team ? 1 : 0);
    if (!best || score > best.score) best = { score, policy: p };
  }
  return best?.policy ?? null;
}

export async function computeSlaTargets(args: {
  priority: TicketPriority;
  team: SupportTeam;
  createdAt: Date;
}): Promise<SlaTargets> {
  const policy = await resolveSlaPolicy({ priority: args.priority, team: args.team });
  const fr = policy?.firstResponseMinutes ?? DEFAULTS_BY_PRIORITY[args.priority].firstResponseMinutes;
  const rs = policy?.resolveMinutes       ?? DEFAULTS_BY_PRIORITY[args.priority].resolveMinutes;
  return {
    policyId: policy?.id ?? null,
    firstResponseDueAt: new Date(args.createdAt.getTime() + fr * 60_000),
    resolveDueAt:       new Date(args.createdAt.getTime() + rs * 60_000),
  };
}

/**
 * Recompute SLA when an agent changes a ticket's priority or team. The
 * first-response target only slides if it hasn't been hit yet — once met,
 * the original target stays in place so analytics keep a stable reference.
 * Resolve target always slides because the breach flag is what gets graded.
 */
export async function recomputeSlaForChange(args: {
  ticketCreatedAt: Date;
  newPriority: TicketPriority;
  newTeam: SupportTeam;
  hadFirstResponse: boolean;
}) {
  const targets = await computeSlaTargets({
    priority: args.newPriority,
    team: args.newTeam,
    createdAt: args.ticketCreatedAt,
  });
  return {
    policyId: targets.policyId,
    firstResponseDueAt: args.hadFirstResponse ? undefined : targets.firstResponseDueAt,
    resolveDueAt: targets.resolveDueAt,
  };
}

/** Minutes until due (negative = overdue). null if dueAt is null. */
export function minutesUntil(dueAt: Date | null, now: Date = new Date()): number | null {
  if (!dueAt) return null;
  return Math.round((dueAt.getTime() - now.getTime()) / 60_000);
}
