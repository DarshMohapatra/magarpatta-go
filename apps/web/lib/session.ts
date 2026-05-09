import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import type { AddressLabel } from '@prisma/client';
import { prisma } from './prisma';

export interface SessionAddress {
  id: string;
  label: AddressLabel;
  society: string;
  building: string;
  flat: string;
  verified: boolean;
  isDefault: boolean;
}

export interface SessionUser {
  phone: string;
  name: string | null;
  // Convenience fields — point to the default address (or null when none).
  society: string | null;
  building: string | null;
  flat: string | null;
  addresses: SessionAddress[];
}

/**
 * Read the mg_session cookie and hydrate the user profile from Postgres
 * in a single server round-trip. Returns null if not signed in.
 *
 * Wrapped in React cache() — multiple calls within one request share a
 * single DB query (navbar + page both call this).
 */
export const getServerSession = cache(async function getServerSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get('mg_session')?.value;
  if (!token) return null;

  let phone: string | null = null;
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    phone = typeof decoded?.phone === 'string' ? decoded.phone : null;
  } catch {
    return null;
  }
  if (!phone) return null;

  const user = await prisma.user.findUnique({
    where: { phone },
    include: { addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] } },
  });

  const addresses: SessionAddress[] = (user?.addresses ?? []).map((a) => ({
    id: a.id,
    label: a.label,
    society: a.society,
    building: a.building,
    flat: a.flat,
    verified: a.verified,
    isDefault: a.isDefault,
  }));
  const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;

  return {
    phone,
    name: user?.name ?? null,
    society: defaultAddr?.society ?? null,
    building: defaultAddr?.building ?? null,
    flat: defaultAddr?.flat ?? null,
    addresses,
  };
});
