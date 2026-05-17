import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';
import { getAdminSession } from '@/lib/admin-session';
import { getCustomerScope } from '@/lib/customer-scope';
import { logActivity } from '@/lib/activity-log';

/**
 * Delivery-proof images for an order.
 *  - GET: anyone with access to the order (customer who owns it, vendor who
 *    fulfils it, or any admin) can read the list.
 *  - POST: vendor or admin uploads a new image (URL already on Vercel Blob).
 */

interface PostBody {
  imageUrl?: string;
  note?: string;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [admin, vendor, scope] = await Promise.all([
    getAdminSession(),
    getVendorSession(),
    getCustomerScope(),
  ]);
  if (!admin && !vendor && !scope) {
    return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  }
  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, userId: true, vendorId: true },
  });
  if (!order) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });

  const allowed = admin
    || (vendor && order.vendorId === vendor.vendorId)
    || (scope && order.userId === scope.userId);
  if (!allowed) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 403 });

  const proofs = await prisma.orderDeliveryProof.findMany({
    where: { orderId: id },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ ok: true, proofs });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [admin, vendor] = await Promise.all([getAdminSession(), getVendorSession()]);
  if (!admin && !vendor) {
    return NextResponse.json({ ok: false, error: 'Vendor or admin only' }, { status: 401 });
  }
  let body: PostBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.imageUrl || typeof body.imageUrl !== 'string') {
    return NextResponse.json({ ok: false, error: 'imageUrl required' }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, vendorId: true, vendorName: true },
  });
  if (!order) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });

  if (vendor && !admin && order.vendorId !== vendor.vendorId) {
    return NextResponse.json({ ok: false, error: 'You can only upload proofs for your own orders' }, { status: 403 });
  }

  const proof = await prisma.orderDeliveryProof.create({
    data: {
      orderId: id,
      imageUrl: body.imageUrl,
      uploadedByRole: admin ? 'ADMIN' : 'VENDOR',
      uploadedById: admin ? admin.id : vendor!.vendorId,
      uploadedByName: admin ? admin.name : vendor!.shopName,
      note: body.note ?? null,
    },
  });

  await logActivity({
    actorRole: admin ? 'ADMIN' : 'VENDOR',
    actorId: admin ? admin.id : vendor!.vendorId,
    actorName: admin ? admin.name : (vendor!.shopName ?? 'Vendor'),
    action: 'DELIVERY_PROOF_UPLOAD',
    summary: `Delivery proof uploaded for order ${id}`,
    metadata: { orderId: id, proofId: proof.id },
  });

  return NextResponse.json({ ok: true, proof });
}
