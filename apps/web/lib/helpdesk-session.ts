import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

export interface HelpdeskSession {
  id: string;
  phone: string;
  name: string;
}

export const HELPDESK_COOKIE = 'mg_helpdesk_session';

export const getHelpdeskSession = cache(async function getHelpdeskSession(): Promise<HelpdeskSession | null> {
  const jar = await cookies();
  const token = jar.get(HELPDESK_COOKIE)?.value;
  if (!token) return null;

  let phone: string | null = null;
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    phone = typeof decoded?.phone === 'string' ? decoded.phone : null;
  } catch {
    return null;
  }
  if (!phone) return null;

  const agent = await prisma.supportAgent.findUnique({ where: { phone } });
  if (!agent || !agent.active) return null;

  return { id: agent.id, phone: agent.phone, name: agent.name };
});

export function encodeHelpdeskToken(phone: string): string {
  return Buffer.from(JSON.stringify({ phone })).toString('base64url');
}
