import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

export interface VendorSession {
  vendorId: string;
  ownerPhone: string;
  ownerName: string;
  shopName: string;
  slug: string;
  approvalStatus: string;
}

export const VENDOR_COOKIE = 'mg_vendor_session';

export const getVendorSession = cache(async function getVendorSession(): Promise<VendorSession | null> {
  const jar = await cookies();
  const token = jar.get(VENDOR_COOKIE)?.value;
  if (!token) return null;

  let phone: string | null = null;
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    phone = typeof decoded?.phone === 'string' ? decoded.phone : null;
  } catch {
    return null;
  }
  if (!phone) return null;

  const vendor = await prisma.vendor.findUnique({ where: { ownerPhone: phone } });
  if (!vendor) return null;

  return {
    vendorId: vendor.id,
    ownerPhone: vendor.ownerPhone!,
    ownerName: vendor.ownerName ?? vendor.name,
    shopName: vendor.name,
    slug: vendor.slug,
    approvalStatus: vendor.approvalStatus,
  };
});

export function encodeVendorToken(phone: string): string {
  return Buffer.from(JSON.stringify({ phone })).toString('base64url');
}
