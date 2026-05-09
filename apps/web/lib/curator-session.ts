import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

export interface CuratorSession {
  id: string;
  phone: string;
  name: string;
}

export const CURATOR_COOKIE = 'mg_curator_session';

export const getCuratorSession = cache(async function getCuratorSession(): Promise<CuratorSession | null> {
  const jar = await cookies();
  const token = jar.get(CURATOR_COOKIE)?.value;
  if (!token) return null;

  let phone: string | null = null;
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    phone = typeof decoded?.phone === 'string' ? decoded.phone : null;
  } catch {
    return null;
  }
  if (!phone) return null;

  const curator = await prisma.curator.findUnique({ where: { phone } });
  if (!curator || !curator.active) return null;

  return { id: curator.id, phone: curator.phone, name: curator.name };
});

export function encodeCuratorToken(phone: string): string {
  return Buffer.from(JSON.stringify({ phone })).toString('base64url');
}
