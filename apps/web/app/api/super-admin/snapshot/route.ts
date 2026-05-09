import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { siteConfig } from '@/lib/site-config';

/**
 * Read-only aggregate snapshot of this instance, polled by the cross-instance
 * super-admin dashboard. Authentication is a shared bearer secret in the
 * `Authorization: Bearer <SUPER_ADMIN_SHARED_SECRET>` header — the same value
 * is set on this instance and on the super-admin host. No PII; just counts
 * and totals so a single human supervising both sites can see at a glance
 * what each one is doing.
 */

export const dynamic = 'force-dynamic';

function startOfDay(): Date {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}

export async function GET(req: Request) {
  const expected = process.env.SUPER_ADMIN_SHARED_SECRET;
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'super-admin endpoint not configured on this instance' }, { status: 503 });
  }

  const auth = req.headers.get('authorization') ?? '';
  const presented = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (presented !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const today = startOfDay();

  const [
    pendingVendors, approvedVendors,
    pendingRiders, approvedRiders,
    pendingCampaigns, pendingChanges,
    activeOrders, todayPlaced,
    todayDelivered,
    totalCustomers,
    recentActivity,
  ] = await Promise.all([
    prisma.vendor.count({ where: { approvalStatus: 'PENDING' } }),
    prisma.vendor.count({ where: { approvalStatus: 'APPROVED' } }),
    prisma.riderProfile.count({ where: { approvalStatus: 'PENDING' } }),
    prisma.riderProfile.count({ where: { approvalStatus: 'APPROVED' } }),
    prisma.campaign.count({ where: { OR: [{ approvalStatus: 'PENDING' }, { pendingRemoval: true }] } }),
    prisma.pendingChange.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { status: { in: ['PLACED', 'ACCEPTED', 'PREPARING', 'PICKED_UP', 'OUT_FOR_DELIVERY'] } } }),
    prisma.order.count({ where: { placedAt: { gte: today } } }),
    prisma.order.findMany({
      where: { status: 'DELIVERED', deliveredAt: { gte: today } },
      select: { totalInr: true, vendorName: true },
    }),
    prisma.user.count(),
    prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, actorRole: true, actorName: true,
        action: true, summary: true, createdAt: true,
      },
    }),
  ]);

  const todayDeliveredCount = todayDelivered.length;
  const todayGmvInr = todayDelivered.reduce((s, o) => s + o.totalInr, 0);

  return NextResponse.json({
    ok: true,
    site: {
      slug: siteConfig.slug,
      siteName: siteConfig.siteName,
      platformName: siteConfig.platformName,
    },
    capturedAt: new Date().toISOString(),
    counts: {
      pendingVendors, approvedVendors,
      pendingRiders, approvedRiders,
      pendingCampaigns, pendingChanges,
      activeOrders, todayPlaced, todayDeliveredCount,
      totalCustomers,
    },
    todayGmvInr,
    recentActivity: recentActivity.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}
