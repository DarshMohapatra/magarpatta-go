import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      addresses: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { orders: true } },
      orders: {
        select: { totalInr: true, status: true, placedAt: true },
      },
    },
  });

  const rows = users.map((u) => {
    const lifetimeInr = u.orders.filter((o) => o.status === 'DELIVERED').reduce((s, o) => s + o.totalInr, 0);
    const lastOrderAt = u.orders[0]?.placedAt ?? null;
    return {
      id: u.id,
      phone: u.phone,
      name: u.name,
      createdAt: u.createdAt,
      orderCount: u._count.orders,
      lifetimeInr,
      lastOrderAt,
      society: u.addresses[0]?.society ?? null,
      building: u.addresses[0]?.building ?? null,
      flat: u.addresses[0]?.flat ?? null,
    };
  });

  return NextResponse.json({ ok: true, customers: rows });
}
