import 'server-only';
import { prisma } from './prisma';

/**
 * Generate a short, human-readable ticket code (T-A4F23B). Caller must
 * verify uniqueness — collision odds at our volume are negligible but
 * non-zero. We retry up to 5 times before giving up.
 */
export async function generateShortCode(): Promise<string> {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit I/O/0/1 to avoid confusion
  for (let attempt = 0; attempt < 5; attempt++) {
    let code = 'T-';
    for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    const exists = await prisma.supportTicket.findUnique({ where: { shortCode: code }, select: { id: true } });
    if (!exists) return code;
  }
  throw new Error('Could not generate unique ticket code after 5 attempts');
}
