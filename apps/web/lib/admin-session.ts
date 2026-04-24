import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import type { AdminRole } from '@prisma/client';
import { prisma } from './prisma';

export interface AdminSession {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  role: AdminRole;
}

export const ADMIN_COOKIE = 'mg_admin_session';

export const getAdminSession = cache(async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  let phone: string | null = null;
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    phone = typeof decoded?.phone === 'string' ? decoded.phone : null;
  } catch {
    return null;
  }
  if (!phone) return null;

  const admin = await prisma.admin.findUnique({ where: { phone } });
  if (!admin) return null;

  return {
    id: admin.id,
    phone: admin.phone,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };
});

export function encodeAdminToken(phone: string): string {
  return Buffer.from(JSON.stringify({ phone })).toString('base64url');
}
