import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * Exchanges a verified Firebase ID token (from phone OTP) for our own
 * httpOnly session cookie. The client calls this after Firebase
 * `confirmationResult.confirm(code)` succeeds.
 */
export async function POST(req: Request) {
  try {
    const { idToken } = await req.json();
    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ ok: false, error: 'idToken required' }, { status: 400 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);

    // We only accept phone-number sign-ins.
    if (decoded.firebase?.sign_in_provider !== 'phone') {
      return NextResponse.json(
        { ok: false, error: 'Phone sign-in required' },
        { status: 400 },
      );
    }

    const phoneE164 = decoded.phone_number;
    if (!phoneE164) {
      return NextResponse.json({ ok: false, error: 'No phone on token' }, { status: 400 });
    }
    // Strip +91 for our internal 10-digit storage format.
    const phone = phoneE164.replace(/^\+91/, '');

    const session = Buffer.from(
      JSON.stringify({ phone, uid: decoded.uid, iat: Date.now() }),
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
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Token verify failed: ${(e as Error).message}` },
      { status: 401 },
    );
  }
}
