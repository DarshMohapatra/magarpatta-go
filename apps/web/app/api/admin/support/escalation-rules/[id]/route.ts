import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import { isTicketPriority, isSupportTeam } from '@/lib/support-tickets';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;
  const rule = await prisma.supportEscalationRule.findUnique({ where: { id } });
  if (!rule) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  let b: Record<string, unknown>;
  try { b = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }
  const data: Record<string, unknown> = {};
  if (typeof b.name === 'string') {
    const name = b.name.trim();
    if (name.length < 2 || name.length > 80) return NextResponse.json({ ok: false, error: 'Name must be 2–80 characters' }, { status: 400 });
    data.name = name;
  }
  if (b.thresholdMinutes !== undefined) data.thresholdMinutes = Math.max(0, Math.min(60 * 24 * 30, Number(b.thresholdMinutes) || 0));
  if (b.bumpToPriority !== undefined) data.bumpToPriority = b.bumpToPriority === null ? null : (isTicketPriority(b.bumpToPriority) ? b.bumpToPriority : (() => { throw new Error('priority'); })());
  if (b.reassignToTeam !== undefined) data.reassignToTeam = b.reassignToTeam === null ? null : (isSupportTeam(b.reassignToTeam)     ? b.reassignToTeam : (() => { throw new Error('team'); })());
  if (b.active !== undefined) data.active = !!b.active;
  if (Array.isArray(b.notifyAgentIds)) data.notifyAgentIds = b.notifyAgentIds.map(String).filter(Boolean).slice(0, 50);

  if (!Object.keys(data).length) return NextResponse.json({ ok: false, error: 'No changes' }, { status: 400 });
  await prisma.supportEscalationRule.update({ where: { id }, data });
  logActivity({ actorRole: 'ADMIN', actorId: admin.id, actorName: admin.name, action: 'ESCALATION_RULE_UPDATE', summary: `${admin.name} updated escalation rule "${rule.name}"`, metadata: { ruleId: id } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;
  const rule = await prisma.supportEscalationRule.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!rule) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  // Soft-delete: keep the row so historical SupportEscalationEvent.ruleId
  // foreign keys remain meaningful in analytics.
  await prisma.supportEscalationRule.update({ where: { id }, data: { active: false } });
  logActivity({ actorRole: 'ADMIN', actorId: admin.id, actorName: admin.name, action: 'ESCALATION_RULE_DELETE', summary: `${admin.name} deactivated escalation rule "${rule.name}"`, metadata: { ruleId: id } });
  return NextResponse.json({ ok: true });
}
