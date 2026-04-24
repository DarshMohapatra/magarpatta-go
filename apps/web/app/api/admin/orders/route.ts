import { NextResponse } from 'next/server';
import type { OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

const ACTIVE: OrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'PICKED_UP', 'OUT_FOR_DELIVERY'];

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const url = new URL(req.url);
  const scope = url.searchParams.get('scope') ?? 'active'; // active | all | today
  const vendorId = url.searchParams.get('vendorId') ?? undefined;

  let where: { status?: { in: OrderStatus[] }; vendorId?: string; placedAt?: { gte: Date } } = {};
  if (scope === 'active') where.status = { in: ACTIVE };
  if (scope === 'today') {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    where.placedAt = { gte: d };
  }
  if (vendorId) where.vendorId = vendorId;

  const orders = await prisma.order.findMany({
    where,
    orderBy: { placedAt: 'desc' },
    take: 100,
    include: { items: { select: { name: true, quantity: true } } },
  });
  return NextResponse.json({ ok: true, orders });
}
