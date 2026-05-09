import { NextResponse } from 'next/server';
import type { DeviationAlertStatus } from '@prisma/client';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: DeviationAlertStatus[] = ['OPEN', 'AWAITING_RIDER', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'];

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;

  const alert = await prisma.riderDeviationAlert.findUnique({
    where: { id },
    include: {
      rider: { select: { id: true, name: true, phone: true, hub: { select: { name: true, latitude: true, longitude: true } } } },
      order: {
        select: {
          id: true, status: true, vendorName: true, vendorHub: true,
          society: true, building: true, flat: true,
          totalInr: true, distanceCoveredM: true,
          placedAt: true, deliveredAt: true,
        },
      },
    },
  });
  if (!alert) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  // Pull a window of pings around the alert for the map view.
  const windowMs = 30 * 60 * 1000;
  const pings = await prisma.riderLocationPing.findMany({
    where: {
      riderId: alert.riderId,
      createdAt: { gte: new Date(alert.detectedAt.getTime() - windowMs), lte: new Date(alert.detectedAt.getTime() + windowMs) },
    },
    orderBy: { createdAt: 'asc' },
    select: { latitude: true, longitude: true, accuracyM: true, createdAt: true, orderId: true },
  });

  return NextResponse.json({ ok: true, alert, pings });
}

/**
 * PATCH supports:
 *   { action: 'request_explanation' }                 → status AWAITING_RIDER, stamp explanationRequestedAt/By
 *   { action: 'resolve', resolution?: string }        → status RESOLVED
 *   { action: 'dismiss', resolution?: string }        → status DISMISSED
 *   { status: '<DeviationAlertStatus>' }              → manual override
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;

  let body: { action?: string; resolution?: string; status?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }

  const alert = await prisma.riderDeviationAlert.findUnique({ where: { id } });
  if (!alert) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  const data: Record<string, unknown> = {};
  let summary = '';

  if (body.action === 'request_explanation') {
    data.status = 'AWAITING_RIDER';
    data.explanationRequestedAt = new Date();
    data.explanationRequestedBy = admin.id;
    summary = `${admin.name} requested explanation`;
  } else if (body.action === 'resolve') {
    data.status = 'RESOLVED';
    data.resolvedAt = new Date();
    data.resolvedBy = admin.id;
    if (body.resolution) data.resolution = body.resolution;
    summary = `${admin.name} resolved deviation${body.resolution ? `: ${body.resolution}` : ''}`;
  } else if (body.action === 'dismiss') {
    data.status = 'DISMISSED';
    data.resolvedAt = new Date();
    data.resolvedBy = admin.id;
    if (body.resolution) data.resolution = body.resolution;
    summary = `${admin.name} dismissed deviation${body.resolution ? `: ${body.resolution}` : ''}`;
  } else if (body.status && VALID_STATUSES.includes(body.status as DeviationAlertStatus)) {
    data.status = body.status;
    summary = `${admin.name} set status → ${body.status}`;
  } else {
    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  }

  await prisma.riderDeviationAlert.update({ where: { id }, data });
  logActivity({
    actorRole: 'ADMIN',
    actorId: admin.id,
    actorName: admin.name,
    action: 'DEVIATION_UPDATE',
    summary,
    metadata: { alertId: id, riderId: alert.riderId, orderId: alert.orderId },
  });

  return NextResponse.json({ ok: true });
}
