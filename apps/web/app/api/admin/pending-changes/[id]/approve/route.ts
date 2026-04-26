import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

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
    }

    await tx.pendingChange.update({
      where: { id },
      data: { status: 'APPROVED', reviewedBy: admin.id, reviewedAt: new Date() },
    });
  });

  // Bust the menu cache so customers see the new state immediately rather
  // than waiting for the 30s TTL.
  revalidateTag('menu');

  return NextResponse.json({ ok: true });
}
