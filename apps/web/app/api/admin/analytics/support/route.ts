import { NextResponse } from 'next/server';
import type { TicketCategory, TicketChannel, SupportTeam, TicketPriority, EscalationTrigger } from '@prisma/client';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface DurationStats {
  avg: number | null;
  p50: number | null;
  p90: number | null;
  sampleSize: number;
}

function stats(durations: number[]): DurationStats {
  if (durations.length === 0) return { avg: null, p50: null, p90: null, sampleSize: 0 };
  const sorted = [...durations].sort((a, b) => a - b);
  const sum = sorted.reduce((s, x) => s + x, 0);
  const avg = sum / sorted.length;
  const at = (p: number) => sorted[Math.floor((sorted.length - 1) * (p / 100))];
  return {
    avg: Math.round(avg),
    p50: Math.round(at(50)),
    p90: Math.round(at(90)),
    sampleSize: sorted.length,
  };
}

function rate(num: number, den: number): number {
  return den === 0 ? 0 : Number((num / den).toFixed(4));
}

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const url = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days') ?? 30)));
  const since = new Date(Date.now() - days * 24 * 60 * 60_000);
  const now = new Date();

  // Single fat fetch for the window — at our scale (a few hundred tickets per
  // month) this is fine and lets us compute all metrics in-process. Revisit
  // if a window grows past ~10k rows.
  const tickets = await prisma.supportTicket.findMany({
    where: { createdAt: { gte: since } },
    select: {
      id: true, category: true, channel: true, team: true, priority: true,
      status: true,
      createdAt: true, firstResponseAt: true, resolvedAt: true,
      firstResponseBreached: true, resolveBreached: true,
      assignedAgentId: true,
    },
  });

  const total = tickets.length;
  const byCategory = countBy(tickets, (t) => t.category);
  const byChannel  = countBy(tickets, (t) => t.channel);
  const byTeam     = countBy(tickets, (t) => t.team);
  const byPriority = countBy(tickets, (t) => t.priority);

  const frDurations = tickets
    .filter((t) => t.firstResponseAt)
    .map((t) => Math.round((t.firstResponseAt!.getTime() - t.createdAt.getTime()) / 60_000));
  const resDurations = tickets
    .filter((t) => t.resolvedAt)
    .map((t) => Math.round((t.resolvedAt!.getTime() - t.createdAt.getTime()) / 60_000));

  const firstResponseBreaches = tickets.filter((t) => t.firstResponseBreached).length;
  const resolveBreaches       = tickets.filter((t) => t.resolveBreached).length;

  // Agents: handled = assigned-to-them tickets in window. avgResolutionMinutes
  // averages over resolved ones only (an unresolved ticket has no MTTR).
  const agentsMap = new Map<string, { handled: number; resolved: number[]; breaches: number }>();
  for (const t of tickets) {
    if (!t.assignedAgentId) continue;
    let entry = agentsMap.get(t.assignedAgentId);
    if (!entry) {
      entry = { handled: 0, resolved: [], breaches: 0 };
      agentsMap.set(t.assignedAgentId, entry);
    }
    entry.handled++;
    if (t.resolvedAt) entry.resolved.push(Math.round((t.resolvedAt.getTime() - t.createdAt.getTime()) / 60_000));
    if (t.firstResponseBreached || t.resolveBreached) entry.breaches++;
  }
  const agentNames = await prisma.supportAgent.findMany({
    where: { id: { in: [...agentsMap.keys()] } },
    select: { id: true, name: true },
  });
  const agents = agentNames.map((a) => {
    const entry = agentsMap.get(a.id)!;
    const avg = entry.resolved.length === 0
      ? null
      : Math.round(entry.resolved.reduce((s, x) => s + x, 0) / entry.resolved.length);
    return { id: a.id, name: a.name, handled: entry.handled, avgResolutionMinutes: avg, breaches: entry.breaches };
  }).sort((a, b) => b.handled - a.handled);

  // Backlog: total currently-open tickets across the platform (NOT bounded by
  // the analytics window — backlog is a live snapshot regardless of how far
  // back the window goes).
  const backlogRows = await prisma.supportTicket.findMany({
    where: { status: { in: ['OPEN', 'IN_REVIEW', 'AWAITING_CUSTOMER'] } },
    select: { status: true, createdAt: true },
  });
  const oldestOpen = backlogRows
    .map((t) => t.createdAt)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const backlog = {
    open:             backlogRows.filter((t) => t.status === 'OPEN').length,
    inReview:         backlogRows.filter((t) => t.status === 'IN_REVIEW').length,
    awaitingCustomer: backlogRows.filter((t) => t.status === 'AWAITING_CUSTOMER').length,
    oldestOpenAgeMinutes: oldestOpen ? Math.round((now.getTime() - oldestOpen.getTime()) / 60_000) : null,
  };

  // Escalations
  const escalations = await prisma.supportEscalationEvent.findMany({
    where: { occurredAt: { gte: since } },
    select: { trigger: true },
  });
  const byTrigger = countBy<{ trigger: EscalationTrigger }, EscalationTrigger>(escalations, (e) => e.trigger);

  // KB analytics
  const kbViews = await prisma.kbArticleView.findMany({
    where: { createdAt: { gte: since } },
    select: { kind: true, articleId: true },
  });
  const suggested = kbViews.filter((v) => v.kind === 'SUGGESTED').length;
  const opened    = kbViews.filter((v) => v.kind === 'OPENED').length;
  const publicViews = kbViews.filter((v) => v.kind === 'PUBLIC').length;

  const perArticle = new Map<string, { suggestions: number; opens: number }>();
  for (const v of kbViews) {
    if (v.kind !== 'SUGGESTED' && v.kind !== 'OPENED') continue;
    let e = perArticle.get(v.articleId);
    if (!e) { e = { suggestions: 0, opens: 0 }; perArticle.set(v.articleId, e); }
    if (v.kind === 'SUGGESTED') e.suggestions++;
    else                         e.opens++;
  }
  const articleIds = [...perArticle.keys()];
  const articleTitles = articleIds.length === 0 ? [] : await prisma.kbArticle.findMany({
    where: { id: { in: articleIds } },
    select: { id: true, title: true, slug: true },
  });
  const topArticles = articleTitles
    .map((a) => {
      const e = perArticle.get(a.id)!;
      return {
        id: a.id, title: a.title, slug: a.slug,
        suggestions: e.suggestions, opens: e.opens,
        ctr: rate(e.opens, e.suggestions),
      };
    })
    .sort((a, b) => b.suggestions - a.suggestions)
    .slice(0, 10);

  return NextResponse.json({
    ok: true,
    windowDays: days,
    generatedAt: now.toISOString(),
    volume: { total, byCategory, byChannel, byTeam, byPriority },
    responseTimes: {
      firstResponseMinutes: stats(frDurations),
      resolutionMinutes:    stats(resDurations),
    },
    sla: {
      firstResponseBreaches,
      resolveBreaches,
      firstResponseBreachRate: rate(firstResponseBreaches, total),
      resolveBreachRate:       rate(resolveBreaches, total),
    },
    agents,
    backlog,
    escalations: { total: escalations.length, byTrigger },
    kb: { suggested, opened, publicViews, suggestionCtr: rate(opened, suggested), topArticles },
  });
}

function countBy<T, K extends string>(rows: T[], pick: (row: T) => K): Array<{ key: K; count: number }> {
  const map = new Map<K, number>();
  for (const r of rows) {
    const k = pick(r);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

// Re-export concrete types so the dashboard can import without dragging in
// the route handler module itself.
export type AnalyticsCategoryBucket = { key: TicketCategory; count: number };
export type AnalyticsChannelBucket  = { key: TicketChannel;  count: number };
export type AnalyticsTeamBucket     = { key: SupportTeam;    count: number };
export type AnalyticsPriorityBucket = { key: TicketPriority; count: number };
