import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import { isTicketCategory, isTicketChannel, isSupportTeam } from '@/lib/support-tickets';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

interface MatchInput { category?: unknown; channel?: unknown; hasOrder?: unknown; keywordsAny?: unknown }
interface ActionInput { team?: unknown; agentId?: unknown; strategy?: unknown }

function sanitizeMatch(m: MatchInput): Prisma.InputJsonValue {
  const out: Record<string, Prisma.InputJsonValue> = {};
  if (m.category !== undefined && isTicketCategory(m.category)) out.category = m.category;
  if (m.channel  !== undefined && isTicketChannel(m.channel))   out.channel  = m.channel;
  if (typeof m.hasOrder === 'boolean') out.hasOrder = m.hasOrder;
  if (Array.isArray(m.keywordsAny)) {
    const kws = m.keywordsAny.map((k) => String(k).trim()).filter(Boolean).slice(0, 25);
    if (kws.length) out.keywordsAny = kws;
  }
  return out;
}

function sanitizeAction(a: ActionInput): Prisma.InputJsonValue {
  const out: Record<string, Prisma.InputJsonValue> = {};
  if (a.team !== undefined && isSupportTeam(a.team)) out.team = a.team;
  if (typeof a.agentId === 'string' && a.agentId.length) out.agentId = a.agentId;
  if (a.strategy === 'ROUND_ROBIN' || a.strategy === 'LEAST_BUSY') out.strategy = a.strategy;
  return out;
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const rules = await prisma.supportRoutingRule.findMany({ orderBy: { priority: 'asc' } });
  return NextResponse.json({ ok: true, rules });
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  let b: { name?: string; priority?: number; match?: MatchInput; action?: ActionInput };
  try { b = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }

  const name = (b.name ?? '').trim();
  if (name.length < 2 || name.length > 80) return NextResponse.json({ ok: false, error: 'Name must be 2–80 characters' }, { status: 400 });
  const match  = sanitizeMatch(b.match  ?? {});
  const action = sanitizeAction(b.action ?? {});
  if (typeof action !== 'object' || !action || Array.isArray(action) || Object.keys(action as Record<string, unknown>).length === 0) {
    return NextResponse.json({ ok: false, error: 'Action must specify at least one of: team, agentId, strategy' }, { status: 400 });
  }

  const rule = await prisma.supportRoutingRule.create({
    data: { name, priority: Math.max(1, Math.min(9999, Number(b.priority) || 100)), match, action },
  });
  logActivity({ actorRole: 'ADMIN', actorId: admin.id, actorName: admin.name, action: 'ROUTING_RULE_CREATE', summary: `${admin.name} created routing rule "${name}"`, metadata: { ruleId: rule.id } });
  return NextResponse.json({ ok: true, rule });
}
