import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import { isSupportTeam } from '@/lib/support-tickets';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;
  const agent = await prisma.supportAgent.findUnique({ where: { id } });
  if (!agent) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  let b: Record<string, unknown>;
  try { b = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }
  const data: Record<string, unknown> = {};
  if (typeof b.name === 'string') {
    const name = b.name.trim();
    if (name.length < 2 || name.length > 80) return NextResponse.json({ ok: false, error: 'Name must be 2–80 characters' }, { status: 400 });
    data.name = name;
  }
  if (b.email !== undefined) data.email = b.email === null || b.email === '' ? null : String(b.email).trim().toLowerCase();
  if (Array.isArray(b.teams)) data.teams = b.teams.filter(isSupportTeam);
  if (b.active !== undefined) data.active = !!b.active;
  if (!Object.keys(data).length) return NextResponse.json({ ok: false, error: 'No changes' }, { status: 400 });

  await prisma.supportAgent.update({ where: { id }, data });
  logActivity({ actorRole: 'ADMIN', actorId: admin.id, actorName: admin.name, action: 'AGENT_UPDATE', summary: `${admin.name} updated agent ${agent.name}`, metadata: { agentId: id, fields: Object.keys(data) } });
  return NextResponse.json({ ok: true });
}
