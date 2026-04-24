import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';

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
  return NextResponse.json({ ok: true, vendor });
}

export async function PATCH(req: Request) {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const b = (await req.json()) as Record<string, unknown>;
  const allow = [
    'description', 'vendorType', 'etaMinutes', 'costForTwo', 'tags',
    'ownerName', 'ownerEmail', 'gstin', 'fssaiNumber', 'drugLicense', 'panNumber',
    'addressLine', 'openTime', 'closeTime',
    'bankAccountNumber', 'bankIfsc', 'bankAccountName', 'upiId',
    'supportsSelfDelivery', 'selfDeliveryFeeInr', 'selfDeliveryAvailable',
  ] as const;
  const data: Record<string, unknown> = {};
  for (const k of allow) {
    if (k in b) data[k] = b[k];
  }

  // Vendor can pause/unpause their own store (but not un-suspend themselves)
  if (typeof b.active === 'boolean') {
    const vendor = await prisma.vendor.findUnique({ where: { id: s.vendorId } });
    if (vendor?.approvalStatus === 'APPROVED') {
      data.active = b.active;
    }
  }

  const updated = await prisma.vendor.update({ where: { id: s.vendorId }, data });
  return NextResponse.json({ ok: true, vendor: updated });
}
