import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createHash, timingSafeEqual } from 'crypto';

/**
 * Super-admin auth.
 *
 * Different identity from the per-instance admin. Lives only on the
 * dedicated super-admin Vercel deployment — there's no DB row; credentials
 * come from env vars (`SUPER_ADMIN_PHONE` + `SUPER_ADMIN_PASSWORD_HASH`).
 * Single human, so a single set of creds.
 *
 * `SUPER_ADMIN_PASSWORD_HASH` is the sha256 hex of the chosen password.
 * Compute it locally with `node -e "console.log(require('crypto').createHash('sha256').update('mypass').digest('hex'))"`.
 */

export const SUPER_COOKIE = 'mg_super_session';

export interface SuperSession {
  phone: string;
  iat: number;
}

export function sha(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function checkPasswordHash(presented: string, expectedHashHex: string): boolean {
  const presentedHashHex = sha(presented);
  if (presentedHashHex.length !== expectedHashHex.length) return false;
  // Constant-time compare to avoid leaking via timing.
  return timingSafeEqual(Buffer.from(presentedHashHex), Buffer.from(expectedHashHex));
}

export function encodeSuperToken(phone: string): string {
  const payload: SuperSession = { phone, iat: Date.now() };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeSuperToken(token: string): SuperSession | null {
  try {
    const json = JSON.parse(Buffer.from(token, 'base64url').toString());
    if (typeof json?.phone === 'string' && typeof json?.iat === 'number') return json;
    return null;
  } catch {
    return null;
  }
}

export const getSuperSession = cache(async function getSuperSession(): Promise<SuperSession | null> {
  const jar = await cookies();
  const token = jar.get(SUPER_COOKIE)?.value;
  if (!token) return null;
  const decoded = decodeSuperToken(token);
  if (!decoded) return null;

  // Re-check the phone matches the configured super-admin. Stops a stale
  // cookie from working after the operator rotates credentials.
  const expectedPhone = process.env.SUPER_ADMIN_PHONE?.trim();
  if (!expectedPhone || decoded.phone !== expectedPhone) return null;

  return decoded;
});
