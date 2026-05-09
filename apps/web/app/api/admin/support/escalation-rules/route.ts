import { NextResponse } from 'next/server';
import type { EscalationTrigger } from '@prisma/client';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import { isTicketPriority, isSupportTeam } from '@/lib/support-tickets';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

const TRIGGERS: EscalationTrigger[] = ['FIRST_RESPONSE_OVERDUE', 'RESOLVE_OVERDUE', 'CUSTOMER_REOPEN', 'INACTIVE_TICKET'];
function isTrigger(v: unknown): v is EscalationTrigger {
  return typeof v === 'string' && (TRIGGERS as string[]).includes(v);
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const rules = await prisma.supportEscalationRule.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ ok: true, rules });
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  let b: { name?: string; trigger?: string; thresholdMinutes?: number; bumpToPriority?: string | null; reassignToTeam?: string | null; notifyAgentIds?: string[] };
  try { b = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }

  const name = (b.name ?? '').trim();
  if (name.length < 2 || name.length > 80) return NextResponse.json({ ok: false, error: 'Name must be 2–80 characters' }, { status: 400 });
  if (!isTrigger(b.trigger)) return NextResponse.json({ ok: false, error: 'Invalid trigger' }, { status: 400 });
  const bump = b.bumpToPriority && isTicketPriority(b.bumpToPriority) ? b.bumpToPriority : null;
  const team = b.reassignToTeam && isSupportTeam(b.reassignToTeam)     ? b.reassignToTeam : null;
  if (!bump && !team) return NextResponse.json({ ok: false, error: 'Specify at least one of: bumpToPriority, reassignToTeam' }, { status: 400 });

  const rule = await prisma.supportEscalationRule.create({
    data: {
      name, trigger: b.trigger,
      thresholdMinutes: Math.max(0, Math.min(60 * 24 * 30, Number(b.thresholdMinutes) || 0)),
      bumpToPriority: bump,
      reassignToTeam: team,
      notifyAgentIds: (b.notifyAgentIds ?? []).map(String).filter(Boolean).slice(0, 50),
    },
  });
  logActivity({ actorRole: 'ADMIN', actorId: admin.id, actorName: admin.name, action: 'ESCALATION_RULE_CREATE', summary: `${admin.name} created escalation rule "${name}"`, metadata: { ruleId: rule.id } });
  return NextResponse.json({ ok: true, rule });
}
