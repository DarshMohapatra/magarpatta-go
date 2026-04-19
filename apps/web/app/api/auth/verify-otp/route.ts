import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { otpStore } from '../send-otp/route';

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json();

    if (!phone || !code) {
      return NextResponse.json({ ok: false, error: 'phone + code required' }, { status: 400 });
    }

    const record = otpStore.get(phone);
    if (!record) {
      return NextResponse.json({ ok: false, error: 'No OTP requested for this number' }, { status: 400 });
    }

    if (Date.now() > record.expires) {
      otpStore.delete(phone);
      return NextResponse.json({ ok: false, error: 'OTP expired. Request a new one.' }, { status: 400 });
    }

    record.attempts += 1;
    if (record.attempts > 5) {
      otpStore.delete(phone);
      return NextResponse.json({ ok: false, error: 'Too many attempts' }, { status: 429 });
    }

    if (record.code !== code) {
      return NextResponse.json({ ok: false, error: 'Incorrect OTP' }, { status: 400 });
    }

    otpStore.delete(phone);

    const session = Buffer.from(
      JSON.stringify({ phone, iat: Date.now() }),
    ).toString('base64url');

    const jar = await cookies();
    jar.set('mg_session', session, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ ok: true, phone });
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}
