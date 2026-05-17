import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';
import { logActivity } from '@/lib/activity-log';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await params;
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: { _count: { select: { products: true, orders: true } } },
  });
  if (!vendor) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, vendor });
}

interface PatchBody {
  isWholesale?: boolean;
  minOrderInr?: number | null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'OPS') {
    return NextResponse.json({ ok: false, error: 'Insufficient permission' }, { status: 403 });
  }
  const { id } = await params;
  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const data: PatchBody = {};
  if (body.isWholesale !== undefined) {
    if (typeof body.isWholesale !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'isWholesale must be boolean' }, { status: 400 });
    }
    data.isWholesale = body.isWholesale;
  }
  if (body.minOrderInr !== undefined) {
    if (body.minOrderInr !== null && (typeof body.minOrderInr !== 'number' || body.minOrderInr < 0 || body.minOrderInr > 1_000_000)) {
      return NextResponse.json({ ok: false, error: 'minOrderInr must be a non-negative integer or null' }, { status: 400 });
    }
    data.minOrderInr = body.minOrderInr;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: 'Nothing to update' }, { status: 400 });
  }

  const vendor = await prisma.vendor.update({ where: { id }, data });
  await logActivity({
    actorRole: 'ADMIN',
    actorId: admin.id,
    actorName: admin.name,
    action: 'VENDOR_UPDATE',
    summary: `${admin.name} updated ${vendor.name} (${Object.keys(data).join(', ')})`,
    metadata: { vendorId: id, ...data },
  });
  return NextResponse.json({ ok: true, vendor });
}
