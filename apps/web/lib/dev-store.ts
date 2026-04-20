/**
 * In-memory store for dev-only fallbacks.
 *
 * Kept only for the legacy /api/auth/send-otp + /verify-otp routes (unused
 * now that we're on Firebase, but left for easy rollback). Real user data,
 * addresses, and waitlist entries live in Prisma/Neon.
 */

export const otpStore = new Map<
  string,
  { code: string; expires: number; attempts: number }
>();
