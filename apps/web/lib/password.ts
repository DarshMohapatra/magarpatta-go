import 'server-only';
import { createHash, timingSafeEqual } from 'crypto';

// Dev-only hashing. Swap to bcrypt before production launch.
export function hashPassword(pw: string): string {
  return createHash('sha256').update(pw).digest('hex');
}

export function verifyPassword(pw: string, hash: string): boolean {
  const a = Buffer.from(hashPassword(pw), 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
