import { notFound, redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import { AdminShell } from '@/components/admin/admin-shell';
import { AdminDeviationDetailClient } from './detail-client';

export const dynamic = 'force-dynamic';

export default async function AdminDeviationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/signin');
  const { id } = await params;

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
  if (!alert) notFound();

  const windowMs = 30 * 60 * 1000;
  const pings = await prisma.riderLocationPing.findMany({
    where: {
      riderId: alert.riderId,
      createdAt: { gte: new Date(alert.detectedAt.getTime() - windowMs), lte: new Date(alert.detectedAt.getTime() + windowMs) },
    },
    orderBy: { createdAt: 'asc' },
    select: { latitude: true, longitude: true, accuracyM: true, createdAt: true, orderId: true },
  });

  return (
    <AdminShell name={admin.name} role={admin.role}>
      <AdminDeviationDetailClient
        alert={{
          id: alert.id,
          detectedAt: alert.detectedAt.toISOString(),
          lastLatitude: alert.lastLatitude,
          lastLongitude: alert.lastLongitude,
          distanceFromCorridorM: alert.distanceFromCorridorM,
          durationOutsideS: alert.durationOutsideS,
          severity: alert.severity,
          status: alert.status,
          explanationRequestedAt: alert.explanationRequestedAt?.toISOString() ?? null,
          riderExplanation: alert.riderExplanation,
          riderExplainedAt: alert.riderExplainedAt?.toISOString() ?? null,
          resolvedAt: alert.resolvedAt?.toISOString() ?? null,
          resolution: alert.resolution,
          rider: alert.rider,
          order: alert.order ? {
            ...alert.order,
            placedAt: alert.order.placedAt.toISOString(),
            deliveredAt: alert.order.deliveredAt?.toISOString() ?? null,
          } : null,
        }}
        pings={pings.map((p) => ({
          lat: p.latitude, lng: p.longitude, accuracyM: p.accuracyM,
          at: p.createdAt.toISOString(),
          onOrder: p.orderId !== null,
        }))}
      />
    </AdminShell>
  );
}
