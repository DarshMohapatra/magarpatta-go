import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;
  const rule = await prisma.supportRoutingRule.findUnique({ where: { id } });
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
  if (b.priority !== undefined) data.priority = Math.max(1, Math.min(9999, Number(b.priority) || 100));
  if (b.active !== undefined) data.active = !!b.active;
  // match/action are passed through as opaque JSON; validation is the caller's
  // responsibility (the editor UI already restricts inputs to valid shapes).
  if (b.match  !== undefined) data.match  = b.match  as Prisma.InputJsonValue;
  if (b.action !== undefined) data.action = b.action as Prisma.InputJsonValue;

  if (!Object.keys(data).length) return NextResponse.json({ ok: false, error: 'No changes' }, { status: 400 });
  await prisma.supportRoutingRule.update({ where: { id }, data });
  logActivity({ actorRole: 'ADMIN', actorId: admin.id, actorName: admin.name, action: 'ROUTING_RULE_UPDATE', summary: `${admin.name} updated routing rule "${rule.name}"`, metadata: { ruleId: id } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;
  const rule = await prisma.supportRoutingRule.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!rule) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  await prisma.supportRoutingRule.delete({ where: { id } });
  logActivity({ actorRole: 'ADMIN', actorId: admin.id, actorName: admin.name, action: 'ROUTING_RULE_DELETE', summary: `${admin.name} deleted routing rule "${rule.name}"`, metadata: { ruleId: id } });
  return NextResponse.json({ ok: true });
}
