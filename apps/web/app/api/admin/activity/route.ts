import { NextResponse } from 'next/server';
import type { ActorRole, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

const VALID_ROLES: ActorRole[] = ['VENDOR', 'RIDER', 'CURATOR', 'ADMIN', 'CUSTOMER'];

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const url = new URL(req.url);
  const role = url.searchParams.get('role');
  const actor = url.searchParams.get('actor');  // free-text match against actorName
  const action = url.searchParams.get('action');
  const limitParam = Number(url.searchParams.get('limit') ?? 100);
  const limit = Math.max(1, Math.min(500, Number.isFinite(limitParam) ? limitParam : 100));

  const where: Prisma.ActivityLogWhereInput = {};
  if (role && VALID_ROLES.includes(role as ActorRole)) where.actorRole = role as ActorRole;
  if (actor) where.actorName = { contains: actor, mode: 'insensitive' };
  if (action) where.action = action;

  const [rows, perRoleRaw] = await Promise.all([
    prisma.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit }),
    prisma.activityLog.groupBy({ by: ['actorRole'], _count: true }),
  ]);

  const perRole: Record<string, number> = {};
  for (const r of perRoleRaw) perRole[r.actorRole] = r._count;

  return NextResponse.json({ ok: true, rows, perRole });
}
