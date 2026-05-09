import { NextResponse } from 'next/server';
import type { TicketStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { evaluateEscalation, applyEscalation } from '@/lib/support-escalation';

export const dynamic = 'force-dynamic';
// Cap at 60s — well above the time we need but short enough that a wedged
// scan can't tie up a Vercel function slot indefinitely.
export const maxDuration = 60;

const OPEN_STATUSES: TicketStatus[] = ['OPEN', 'IN_REVIEW', 'AWAITING_CUSTOMER'];

/**
 * Vercel Cron tick (default schedule: every 5 minutes — set in vercel.json).
 *
 *   1. Stamp first-response breaches on tickets that are past due but were
 *      never replied to. Flag is sticky for analytics.
 *   2. Stamp resolve breaches on tickets that are past due but not resolved.
 *   3. Run escalation rules across every open ticket. Each rule can bump
 *      priority and/or reassign the team; events land in
 *      SupportEscalationEvent for audit.
 *
 * Vercel sends GET to cron paths. We also accept POST so the same handler
 * works when triggered manually from a script.
 */
async function tick(req: Request) {
  // Vercel Cron sends `authorization: Bearer <CRON_SECRET>` when the env var
  // is set on the project. Reject anything else so this can't be hammered
  // anonymously to enumerate ticket counts.
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now = new Date();

  const frBreaches = await prisma.supportTicket.updateMany({
    where: {
      firstResponseAt: null,
      firstResponseBreached: false,
      firstResponseDueAt: { lt: now },
      status: { in: OPEN_STATUSES },
    },
    data: { firstResponseBreached: true },
  });

  const resBreaches = await prisma.supportTicket.updateMany({
    where: {
      resolveBreached: false,
      resolveDueAt: { lt: now },
      status: { in: OPEN_STATUSES },
    },
    data: { resolveBreached: true },
  });

  // Pull open tickets with their most recent message timestamp so the
  // INACTIVE_TICKET trigger has the data it needs without a per-ticket query.
  const tickets = await prisma.supportTicket.findMany({
    where: { status: { in: OPEN_STATUSES } },
    select: {
      id: true,
      priority: true,
      team: true,
      status: true,
      firstResponseAt: true,
      firstResponseDueAt: true,
      resolveDueAt: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
    take: 1000,
  });

  let escalationsApplied = 0;
  for (const t of tickets) {
    const lastMessageAt = t.messages[0]?.createdAt ?? null;
    const r = await evaluateEscalation({
      ticket: t,
      now,
      lastMessageAt,
    });
    if (r.events.length) {
      await applyEscalation({
        ticketId: t.id,
        events: r.events,
        finalPriority: r.newPriority,
        finalTeam:     r.newTeam,
      });
      escalationsApplied += r.events.length;
    }
  }

  return NextResponse.json({
    ok: true,
    summary: {
      firstResponseBreachesMarked: frBreaches.count,
      resolveBreachesMarked:       resBreaches.count,
      ticketsScanned:              tickets.length,
      escalationsApplied,
      runAt:                       now.toISOString(),
    },
  });
}

export const GET  = tick;
export const POST = tick;
