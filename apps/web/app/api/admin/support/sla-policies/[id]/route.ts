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
  const policy = await prisma.supportSlaPolicy.findUnique({ where: { id } });
  if (!policy) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  let b: Record<string, unknown>;
  try { b = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }

  const data: Record<string, unknown> = {};
  if (b.name !== undefined) {
    const name = String(b.name).trim();
    if (name.length < 2 || name.length > 80) return NextResponse.json({ ok: false, error: 'Name must be 2–80 characters' }, { status: 400 });
    data.name = name;
  }
  if (b.priority !== undefined) data.priority = b.priority === null ? null : (isTicketPriority(b.priority) ? b.priority : (() => { throw new Error('priority'); })());
  if (b.team     !== undefined) data.team     = b.team     === null ? null : (isSupportTeam(b.team)         ? b.team     : (() => { throw new Error('team'); })());
  if (b.firstResponseMinutes !== undefined) data.firstResponseMinutes = Math.max(1, Math.min(60 * 24 * 30, Number(b.firstResponseMinutes) || 0));
  if (b.resolveMinutes       !== undefined) data.resolveMinutes       = Math.max(1, Math.min(60 * 24 * 60, Number(b.resolveMinutes)       || 0));
  if (b.active            !== undefined) data.active            = !!b.active;
  if (b.businessHoursOnly !== undefined) data.businessHoursOnly = !!b.businessHoursOnly;

  if (!Object.keys(data).length) return NextResponse.json({ ok: false, error: 'No changes' }, { status: 400 });
  await prisma.supportSlaPolicy.update({ where: { id }, data });
  logActivity({ actorRole: 'ADMIN', actorId: admin.id, actorName: admin.name, action: 'SLA_POLICY_UPDATE', summary: `${admin.name} updated SLA policy "${policy.name}"`, metadata: { policyId: id } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;
  const policy = await prisma.supportSlaPolicy.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!policy) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  // Soft-delete via active=false so any historical SupportTicket.slaPolicyId
  // foreign keys remain valid for analytics reconstruction.
  await prisma.supportSlaPolicy.update({ where: { id }, data: { active: false } });
  logActivity({ actorRole: 'ADMIN', actorId: admin.id, actorName: admin.name, action: 'SLA_POLICY_DELETE', summary: `${admin.name} deactivated SLA policy "${policy.name}"`, metadata: { policyId: id } });
  return NextResponse.json({ ok: true });
}
