import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import { isTicketPriority, isSupportTeam } from '@/lib/support-tickets';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const policies = await prisma.supportSlaPolicy.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ ok: true, policies });
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  let b: { name?: string; priority?: string | null; team?: string | null; firstResponseMinutes?: number; resolveMinutes?: number; businessHoursOnly?: boolean };
  try { b = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }

  const name = (b.name ?? '').trim();
  if (name.length < 2 || name.length > 80) return NextResponse.json({ ok: false, error: 'Name must be 2–80 characters' }, { status: 400 });
  const priority = b.priority && isTicketPriority(b.priority) ? b.priority : null;
  const team     = b.team     && isSupportTeam(b.team)         ? b.team     : null;
  const fr = Math.max(1, Math.min(60 * 24 * 30, Number(b.firstResponseMinutes) || 0));
  const rs = Math.max(1, Math.min(60 * 24 * 60, Number(b.resolveMinutes) || 0));
  if (!fr || !rs) return NextResponse.json({ ok: false, error: 'Both targets must be > 0 minutes' }, { status: 400 });

  const policy = await prisma.supportSlaPolicy.create({
    data: { name, priority, team, firstResponseMinutes: fr, resolveMinutes: rs, businessHoursOnly: !!b.businessHoursOnly },
  });
  logActivity({ actorRole: 'ADMIN', actorId: admin.id, actorName: admin.name, action: 'SLA_POLICY_CREATE', summary: `${admin.name} created SLA policy "${name}"`, metadata: { policyId: policy.id } });
  return NextResponse.json({ ok: true, policy });
}
