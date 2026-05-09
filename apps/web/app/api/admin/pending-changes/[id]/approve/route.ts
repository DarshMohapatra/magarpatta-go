import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';
import { logActivity } from '@/lib/activity-log';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  const change = await prisma.pendingChange.findUnique({ where: { id } });
  if (!change || change.status !== 'PENDING') {
    return NextResponse.json({ ok: false, error: 'Not pending' }, { status: 400 });
  }

  const payload = (change.payload ?? {}) as Record<string, unknown>;

  await prisma.$transaction(async (tx) => {
    if (change.entity === 'VENDOR' && change.entityId && change.operation === 'UPDATE') {
      await tx.vendor.update({ where: { id: change.entityId }, data: payload as Prisma.VendorUpdateInput });
    } else if (change.entity === 'PRODUCT' && change.operation === 'CREATE') {
      // categorySlug is stored in payload but isn't a Product column; strip it.
      const { categorySlug, ...rest } = payload;
      void categorySlug;
      const created = await tx.product.create({ data: { ...(rest as unknown as Prisma.ProductUncheckedCreateInput), inStock: true } });
      await tx.pendingChange.update({ where: { id }, data: { entityId: created.id } });
    } else if (change.entity === 'PRODUCT' && change.entityId && change.operation === 'UPDATE') {
      await tx.product.update({ where: { id: change.entityId }, data: payload as Prisma.ProductUpdateInput });
    } else if (change.entity === 'PRODUCT' && change.entityId && change.operation === 'DELETE') {
      // Soft-delete: hide from menu. Can't hard-delete due to OrderItem FK.
      await tx.product.update({ where: { id: change.entityId }, data: { inStock: false } });
    } else if (change.entity === 'RIDER' && change.entityId && change.operation === 'UPDATE') {
      await tx.riderProfile.update({ where: { id: change.entityId }, data: payload as Prisma.RiderProfileUpdateInput });
    } else if (change.entity === 'CAMPAIGN' && change.entityId && change.operation === 'DELETE') {
      await tx.campaign.delete({ where: { id: change.entityId } });
    } else if (change.entity === 'CAMPAIGN' && change.entityId && change.operation === 'CREATE') {
      // CREATE rows are audit-only — the Campaign row already exists in PENDING.
      // Approving the audit row promotes it to APPROVED.
      await tx.campaign.update({
        where: { id: change.entityId },
        data: { approvalStatus: 'APPROVED', approvedAt: new Date(), approvedBy: admin.id, approvalNote: null },
      });
    } else if (change.entity === 'CAMPAIGN' && change.entityId && change.operation === 'UPDATE') {
      // The vendor's edit was already written to the Campaign row (with status
      // reset to PENDING). Approving here just promotes it back to APPROVED.
      await tx.campaign.update({
        where: { id: change.entityId },
        data: { approvalStatus: 'APPROVED', approvedAt: new Date(), approvedBy: admin.id, approvalNote: null },
      });
    }

    // If the approved change relates to a campaign, sweep up sibling pending
    // rows for the same campaign so the queues stay in sync.
    if (change.entity === 'CAMPAIGN' && change.entityId) {
      await tx.pendingChange.updateMany({
        where: { entity: 'CAMPAIGN', entityId: change.entityId, status: 'PENDING', id: { not: id } },
        data: { status: 'APPROVED', reviewedBy: admin.id, reviewedAt: new Date() },
      });
    }

    await tx.pendingChange.update({
      where: { id },
      data: { status: 'APPROVED', reviewedBy: admin.id, reviewedAt: new Date() },
    });
  });

  // Bust the menu cache so customers see the new state immediately rather
  // than waiting for the 30s TTL.
  revalidateTag('menu');

  await logActivity({
    actorRole: 'ADMIN',
    actorId: admin.id,
    actorName: admin.name,
    action: 'PENDING_CHANGE_APPROVE',
    summary: `${admin.name} approved ${change.entity.toLowerCase()} ${change.operation.toLowerCase()} — ${change.summary}`,
    metadata: { pendingChangeId: id, entity: change.entity, operation: change.operation, vendorId: change.vendorId },
  });

  return NextResponse.json({ ok: true });
}
