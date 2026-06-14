import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';

/**
 * Customer inbox feed. Returns the 20 most recent notifications + an
 * unread count. Bell icon polls this; the dropdown reads from it.
 *
 * Anonymous visitors get an empty inbox — the bell stays hidden client-side.
 */
export async function GET() {
  const s = await getServerSession();
  if (!s) return NextResponse.json({ ok: true, notifications: [], unreadCount: 0 });

  const user = await prisma.user.findUnique({ where: { phone: s.phone }, select: { id: true } });
  if (!user) return NextResponse.json({ ok: true, notifications: [], unreadCount: 0 });

  const [notifications, unreadCount] = await Promise.all([
    prisma.customerNotification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.customerNotification.count({
      where: { userId: user.id, readAt: null },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    notifications: notifications.map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      orderId: n.orderId,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  });
}
