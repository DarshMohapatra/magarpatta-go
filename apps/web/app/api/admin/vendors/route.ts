import { NextResponse } from 'next/server';
import type { VendorApprovalStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

const VALID: VendorApprovalStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const url = new URL(req.url);
  const statusParam = url.searchParams.get('status');
  const where = statusParam && VALID.includes(statusParam as VendorApprovalStatus)
    ? { approvalStatus: statusParam as VendorApprovalStatus }
    : {};

  const vendors = await prisma.vendor.findMany({
    where,
    orderBy: [{ approvalStatus: 'asc' }, { createdAt: 'desc' }],
    include: { _count: { select: { products: true, orders: true } } },
  });

  const counts = await prisma.vendor.groupBy({
    by: ['approvalStatus'],
    _count: true,
  });

  return NextResponse.json({ ok: true, vendors, counts });
}
