import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

export interface SessionUser {
  phone: string;
  name: string | null;
  society: string | null;
  building: string | null;
  flat: string | null;
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
    include: { addresses: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });

  const addr = user?.addresses[0];
  return {
    phone,
    name: user?.name ?? null,
    society: addr?.society ?? null,
    building: addr?.building ?? null,
    flat: addr?.flat ?? null,
  };
});
