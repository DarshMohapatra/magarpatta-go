import { NextResponse } from 'next/server';
import { getRiderSession } from '@/lib/rider-session';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

/**
 * Rider posts an explanation for a deviation alert. Only the rider the
 * alert is against can reply, and only while the alert is AWAITING_RIDER
 * (admin must request first).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getRiderSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const profile = await prisma.riderProfile.findUnique({ where: { phone: session.phone }, select: { id: true, name: true } });
  if (!profile) return NextResponse.json({ ok: false, error: 'No rider profile' }, { status: 404 });

  const { id } = await ctx.params;
  let body: { explanation?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }

  const text = (body.explanation ?? '').trim();
  if (text.length < 5 || text.length > 2000) return NextResponse.json({ ok: false, error: 'Explanation must be 5–2000 characters' }, { status: 400 });

  const alert = await prisma.riderDeviationAlert.findUnique({ where: { id } });
  if (!alert) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  if (alert.riderId !== profile.id) return NextResponse.json({ ok: false, error: 'Not your alert' }, { status: 403 });
  if (alert.status !== 'AWAITING_RIDER') return NextResponse.json({ ok: false, error: 'Admin has not requested an explanation on this alert' }, { status: 409 });

  await prisma.riderDeviationAlert.update({
    where: { id },
    data: {
      riderExplanation: text,
      riderExplainedAt: new Date(),
      status: 'UNDER_REVIEW',
    },
  });

  logActivity({
    actorRole: 'RIDER',
    actorId: profile.id,
    actorName: profile.name,
    action: 'DEVIATION_EXPLAIN',
    summary: `${profile.name} explained deviation`,
    metadata: { alertId: id },
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  // Rider lists their own AWAITING_RIDER alerts (used by the rider portal banner).
  const session = await getRiderSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const profile = await prisma.riderProfile.findUnique({ where: { phone: session.phone }, select: { id: true } });
  if (!profile) return NextResponse.json({ ok: false, error: 'No rider profile' }, { status: 404 });

  const alerts = await prisma.riderDeviationAlert.findMany({
    where: { riderId: profile.id, status: 'AWAITING_RIDER' },
    orderBy: { detectedAt: 'desc' },
    select: {
      id: true, detectedAt: true, distanceFromCorridorM: true, durationOutsideS: true,
      severity: true, orderId: true, explanationRequestedAt: true,
    },
  });
  return NextResponse.json({ ok: true, alerts });
}
