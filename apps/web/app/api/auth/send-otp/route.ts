import { NextResponse } from 'next/server';
import { otpStore } from '@/lib/dev-store';

const PHONE_RE = /^[6-9]\d{9}$/;

/**
 * Send SMS OTP via Fast2SMS (India).
 *
 * Uses Fast2SMS's "otp" route, which:
 *  - Does not require DLT registration (Fast2SMS handles compliance on their shared sender).
 *  - Sends a simple "Your OTP: XXXXXX" message.
 *  - Costs ~₹0.15 per SMS.
 *
 * Configure by setting FAST2SMS_API_KEY in the environment.
 */
async function sendViaFast2SMS(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.FAST2SMS_API_KEY;
  if (!key) return { ok: false, error: 'FAST2SMS_API_KEY not set' };

  try {
    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variables_values: code,
        route: 'otp',
        numbers: phone,
      }),
    });

    const data = (await res.json()) as { return?: boolean; message?: string | string[] };
    if (!res.ok || !data.return) {
      const msg = Array.isArray(data.message) ? data.message.join('; ') : data.message;
      return { ok: false, error: `Fast2SMS: ${msg ?? 'unknown error'}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Fast2SMS network error: ${(e as Error).message}` };
  }
}

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone || !PHONE_RE.test(phone)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid phone. Expected 10-digit Indian mobile.' },
        { status: 400 },
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, {
      code,
      expires: Date.now() + 5 * 60 * 1000,
      attempts: 0,
    });

    const smsConfigured = Boolean(process.env.FAST2SMS_API_KEY);

    if (smsConfigured) {
      const result = await sendViaFast2SMS(phone, code);
      if (result.ok) {
        console.log(`[OTP] Sent via Fast2SMS to +91 ${phone}`);
        return NextResponse.json({
          ok: true,
          smsConfigured: true,
          message: 'OTP sent to your phone',
        });
      }
      // SMS provider failed — fall through to dev-hint so testing isn't blocked.
      console.warn(`[OTP] Fast2SMS failed for +91 ${phone} → falling back to dev hint: ${result.error}`);
      return NextResponse.json({
        ok: true,
        devHint: code,
        smsConfigured: false,
        smsError: result.error,
        message: 'SMS provider unavailable — OTP shown on screen',
      });
    }

    // Dev mode: no SMS provider wired — show the code in the response for testing.
    console.log(`[OTP] DEV +91 ${phone} -> ${code}`);
    return NextResponse.json({
      ok: true,
      devHint: code,
      smsConfigured: false,
      message: 'OTP generated (dev mode — SMS not yet configured)',
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}
