import 'server-only';
import { createHash } from 'crypto';
import { prisma } from './prisma';

export type OtpPurpose =
  | 'CUSTOMER_SIGNIN'
  | 'VENDOR_SIGNIN'
  | 'VENDOR_REGISTER'
  | 'RIDER_SIGNIN'
  | 'RIDER_REGISTER'
  | 'ADMIN_SIGNIN';

const OTP_VALIDITY_SECONDS = 5 * 60;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Phones that accept the demo OTP "123456" without sending a real SMS.
 * Keeps the test flow instant for the seeded vendors, riders, and admin.
 * Real customer phones always go through Fast2SMS.
 */
const DEMO_PHONES = new Set([
  // vendors
  '9000000001', '9000000002', '9000000003', '9000000004', '9000000005', '9000000006', '9000000007',
  // riders
  '8888888801', '8888888802', '8888888803', '8888888804', '8888888805',
  // admin
  '9999999999',
]);
const DEMO_OTP = '123456';

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function random6(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export interface SendResult {
  ok: boolean;
  error?: string;
  /** True when the code was delivered via SMS (not just logged). */
  smsSent?: boolean;
  /** Populated for demo phones so the UI can show a hint. */
  demoOtp?: string;
}

export async function sendOtp(phone: string, purpose: OtpPurpose): Promise<SendResult> {
  if (!/^\d{10}$/.test(phone)) return { ok: false, error: 'Enter a 10-digit phone.' };

  const existing = await prisma.otpCode.findUnique({
    where: { phone_purpose: { phone, purpose } },
  });
  if (existing && Date.now() - existing.createdAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000) {
    const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - (Date.now() - existing.createdAt.getTime()) / 1000);
    return { ok: false, error: `Wait ${wait}s before asking for a new code.` };
  }

  const isDemoPhone = DEMO_PHONES.has(phone);
  const code = isDemoPhone ? DEMO_OTP : random6();
  const expiresAt = new Date(Date.now() + OTP_VALIDITY_SECONDS * 1000);

  await prisma.otpCode.upsert({
    where: { phone_purpose: { phone, purpose } },
    create: { phone, purpose, codeHash: sha256(code), expiresAt, attempts: 0 },
    update: { codeHash: sha256(code), expiresAt, attempts: 0, consumedAt: null, createdAt: new Date() },
  });

  let smsSent = false;
  if (!isDemoPhone) {
    smsSent = await sendFast2SMS(phone, code);
  }

  // Always log server-side so the developer can grab the code during testing.
  console.log(`[otp] ${purpose} for +91 ${phone} → ${code} (demo=${isDemoPhone}, smsSent=${smsSent})`);

  return { ok: true, smsSent, demoOtp: isDemoPhone ? DEMO_OTP : undefined };
}

export interface VerifyResult {
  ok: boolean;
  error?: string;
}

export async function verifyOtp(phone: string, purpose: OtpPurpose, code: string): Promise<VerifyResult> {
  if (!/^\d{6}$/.test(code)) return { ok: false, error: 'Enter the 6-digit code.' };

  const row = await prisma.otpCode.findUnique({
    where: { phone_purpose: { phone, purpose } },
  });
  if (!row) return { ok: false, error: 'No code pending. Tap Get OTP first.' };
  if (row.consumedAt) return { ok: false, error: 'This code has already been used. Request a new one.' };
  if (row.expiresAt < new Date()) return { ok: false, error: 'Code expired. Request a new one.' };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: 'Too many wrong attempts. Request a new code.' };

  if (sha256(code) !== row.codeHash) {
    await prisma.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: 'Wrong code.' };
  }

  await prisma.otpCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}

async function sendFast2SMS(phone: string, code: string): Promise<boolean> {
  const key = process.env.FAST2SMS_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        authorization: key,
      },
      body: new URLSearchParams({
        route: 'otp',
        variables_values: code,
        numbers: phone,
      }),
    });
    if (!res.ok) {
      console.error('[fast2sms] non-2xx:', res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (e) {
    console.error('[fast2sms] send failed:', e);
    return false;
  }
}

/** Exposed for the UI so the signin forms can render a subtle demo hint. */
export function isDemoPhone(phone: string): boolean {
  return DEMO_PHONES.has(phone);
}
