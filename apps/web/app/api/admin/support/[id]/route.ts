import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Admin read-only access to a support ticket. Admin oversees but does not
 * modify — all writes are owned by the helpdesk role.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await ctx.params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      order: { select: { id: true, totalInr: true, vendorName: true, placedAt: true, status: true } },
      messages: { orderBy: { createdAt: 'asc' } },
      assignedAgent: { select: { id: true, name: true } },
    },
  });
  if (!ticket) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  return NextResponse.json({ ok: true, ticket });
}
