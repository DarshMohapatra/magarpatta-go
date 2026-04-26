import { NextResponse } from 'next/server';
import type { PendingChangeStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

const VALID: PendingChangeStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const url = new URL(req.url);
  const statusParam = url.searchParams.get('status');
  const status = (VALID.includes(statusParam as PendingChangeStatus)
    ? statusParam
    : 'PENDING') as PendingChangeStatus;

  const [changes, counts] = await Promise.all([
    prisma.pendingChange.findMany({
      where: { status },
      orderBy: { submittedAt: 'desc' },
      include: { vendor: { select: { id: true, name: true, slug: true, hub: true } } },
    }),
    prisma.pendingChange.groupBy({ by: ['status'], _count: true }),
  ]);

  return NextResponse.json({ ok: true, changes, counts, status });
}
