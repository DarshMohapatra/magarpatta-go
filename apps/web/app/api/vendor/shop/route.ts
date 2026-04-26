import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';
import { queueChange, pickFields, summariseFieldEdit } from '@/lib/pending-change';

const EDITABLE = [
  'description', 'vendorType', 'etaMinutes', 'costForTwo', 'tags',
  'ownerName', 'ownerEmail', 'gstin', 'fssaiNumber', 'drugLicense', 'panNumber',
  'addressLine', 'openTime', 'closeTime',
  'bankAccountNumber', 'bankIfsc', 'bankAccountName', 'upiId',
  'supportsSelfDelivery', 'selfDeliveryFeeInr', 'selfDeliveryAvailable',
] as const;

export async function GET() {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const vendor = await prisma.vendor.findUnique({
    where: { id: s.vendorId },
    select: {
      id: true, slug: true, name: true, hub: true, description: true, vendorType: true,
      active: true, approvalStatus: true, approvalNote: true, rating: true,
      etaMinutes: true, costForTwo: true, tags: true,
      ownerName: true, ownerPhone: true, ownerEmail: true,
      gstin: true, fssaiNumber: true, drugLicense: true, panNumber: true,
      addressLine: true, openTime: true, closeTime: true,
      bankAccountNumber: true, bankIfsc: true, bankAccountName: true, upiId: true,
      commissionPct: true,
      supportsSelfDelivery: true, selfDeliveryFeeInr: true,
      selfDeliveryAvailable: true, onPlatform: true,
    },
  });

  // Surface any pending edits so the UI can show "awaiting review" state.
  const pending = await prisma.pendingChange.findFirst({
    where: { entity: 'VENDOR', entityId: s.vendorId, status: 'PENDING' },
    orderBy: { submittedAt: 'desc' },
  });

  return NextResponse.json({ ok: true, vendor, pendingEdit: pending });
}

export async function PATCH(req: Request) {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const b = (await req.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const k of EDITABLE) {
    if (k in b) data[k] = b[k];
  }

  const vendor = await prisma.vendor.findUnique({ where: { id: s.vendorId } });
  if (!vendor) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  // Pause/unpause is operational — apply instantly when APPROVED.
  if (typeof b.active === 'boolean' && vendor.approvalStatus === 'APPROVED') {
    await prisma.vendor.update({ where: { id: s.vendorId }, data: { active: b.active } });
    revalidateTag('menu');
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true, queued: false });
  }

  // While the shop is still PENDING (first-time approval), let the vendor
  // edit freely — they're filling out their initial profile. Once APPROVED,
  // every config edit is queued for admin review.
  if (vendor.approvalStatus !== 'APPROVED') {
    await prisma.vendor.update({ where: { id: s.vendorId }, data });
    return NextResponse.json({ ok: true, queued: false });
  }

  const before = pickFields(vendor as unknown as Record<string, unknown>, Object.keys(data));
  const change = await queueChange({
    entity: 'VENDOR',
    entityId: s.vendorId,
    operation: 'UPDATE',
    payload: data as never,
    before: before as never,
    summary: summariseFieldEdit(vendor.name, Object.keys(data)),
    vendorId: s.vendorId,
  });

  return NextResponse.json({ ok: true, queued: true, pendingId: change.id });
}
