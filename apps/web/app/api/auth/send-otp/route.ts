import { NextResponse } from 'next/server';

const otpStore = new Map<string, { code: string; expires: number; attempts: number }>();
export { otpStore };

const PHONE_RE = /^[6-9]\d{9}$/;

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

    // TODO: When MSG91 keys are wired, replace with real send.
    // await fetch('https://control.msg91.com/api/v5/flow/', { ... })
    console.log(`[DEV OTP] +91 ${phone} -> ${code}`);

    return NextResponse.json({
      ok: true,
      devHint: process.env.NODE_ENV !== 'production' ? code : undefined,
      message: 'OTP sent',
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}
