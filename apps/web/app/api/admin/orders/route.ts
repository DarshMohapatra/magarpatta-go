import { NextResponse } from 'next/server';
import type { OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

const ACTIVE: OrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'PICKED_UP', 'OUT_FOR_DELIVERY'];

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const url = new URL(req.url);
  const scope = url.searchParams.get('scope') ?? 'active';
  const vendorId = url.searchParams.get('vendorId') ?? undefined;

  let where: { status?: OrderStatus | { in: OrderStatus[] }; vendorId?: string; placedAt?: { gte: Date } } = {};
  if (scope === 'active')    where.status = { in: ACTIVE };
  if (scope === 'delivered') where.status = 'DELIVERED';
  if (scope === 'cancelled') where.status = 'CANCELLED';
  if (scope === 'today') {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    where.placedAt = { gte: d };
  }
  // scope = 'all' → no filter
  if (vendorId) where.vendorId = vendorId;

  const [orders, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { placedAt: 'desc' },
      take: 100,
      include: { items: { select: { name: true, quantity: true } } },
    }),
    // Give the UI instant badge counts across scopes.
    Promise.all([
      prisma.order.count({ where: { status: { in: ACTIVE } } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
    ]).then(([active, delivered, cancelled]) => ({ active, delivered, cancelled })),
  ]);
  return NextResponse.json({ ok: true, orders, counts });
}
