import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

export interface RiderSession {
  phone: string;
  name: string;
  perDropInr: number;
}

export const COOKIE_NAME = 'mg_rider_session';

export const getRiderSession = cache(async function getRiderSession(): Promise<RiderSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let phone: string | null = null;
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    phone = typeof decoded?.phone === 'string' ? decoded.phone : null;
  } catch {
    return null;
  }
  if (!phone) return null;

  const rider = await prisma.riderProfile.findUnique({ where: { phone } });
  if (!rider || rider.approvalStatus !== 'APPROVED') return null;
  return { phone: rider.phone, name: rider.name, perDropInr: rider.perDropInr };
});

export function encodeRiderToken(phone: string): string {
  return Buffer.from(JSON.stringify({ phone })).toString('base64url');
}
