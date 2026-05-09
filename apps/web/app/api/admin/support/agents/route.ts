import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import { isSupportTeam } from '@/lib/support-tickets';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const agents = await prisma.supportAgent.findMany({
    orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true, name: true, phone: true, email: true,
      teams: true, active: true, createdAt: true,
      _count: { select: { assignedTickets: { where: { status: { in: ['OPEN', 'IN_REVIEW', 'AWAITING_CUSTOMER'] } } } } },
    },
  });
  return NextResponse.json({ ok: true, agents });
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  let b: { name?: string; phone?: string; email?: string | null; teams?: string[] };
  try { b = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }

  const name = (b.name ?? '').trim();
  const phone = (b.phone ?? '').replace(/\D/g, '').slice(-10);
  if (name.length < 2 || name.length > 80) return NextResponse.json({ ok: false, error: 'Name must be 2–80 characters' }, { status: 400 });
  if (phone.length !== 10) return NextResponse.json({ ok: false, error: 'Phone must be a 10-digit Indian mobile' }, { status: 400 });
  const email = b.email ? String(b.email).trim().toLowerCase() : null;
  const teams = (b.teams ?? []).filter(isSupportTeam);

  const dupe = await prisma.supportAgent.findUnique({ where: { phone }, select: { id: true } });
  if (dupe) return NextResponse.json({ ok: false, error: 'An agent with that phone already exists' }, { status: 409 });

  const agent = await prisma.supportAgent.create({ data: { name, phone, email, teams } });
  logActivity({ actorRole: 'ADMIN', actorId: admin.id, actorName: admin.name, action: 'AGENT_CREATE', summary: `${admin.name} added helpdesk agent ${name}`, metadata: { agentId: agent.id } });
  return NextResponse.json({ ok: true, agent });
}
