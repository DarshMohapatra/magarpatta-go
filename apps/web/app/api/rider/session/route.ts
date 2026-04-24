import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyOtp } from '@/lib/otp';
import { encodeRiderToken, COOKIE_NAME } from '@/lib/rider-session';

/**
 * Rider signin via phone OTP. Replaces the previous phone-only flow which
 * had no credential check.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { phone?: string; code?: string };
  const phone = (body.phone ?? '').replace(/\D/g, '').slice(-10);
  const code = (body.code ?? '').trim();
  if (phone.length !== 10) {
    return NextResponse.json({ ok: false, error: 'Enter a 10-digit phone.' }, { status: 400 });
  }

  const rider = await prisma.riderProfile.findUnique({ where: { phone } });
  if (!rider) {
    return NextResponse.json(
      { ok: false, error: 'No rider application on this phone. Register first to apply.' },
      { status: 401 },
    );
  }
  if (rider.approvalStatus === 'PENDING') {
    return NextResponse.json({ ok: false, error: 'Your application is still under review. We\'ll call you soon.' }, { status: 403 });
  }
  if (rider.approvalStatus === 'REJECTED') {
    return NextResponse.json({ ok: false, error: 'Your application was not approved. Contact ops if you think this is wrong.' }, { status: 403 });
  }
  if (rider.approvalStatus === 'SUSPENDED') {
    return NextResponse.json({ ok: false, error: 'Your rider account is currently suspended.' }, { status: 403 });
  }

  const v = await verifyOtp(phone, 'RIDER_SIGNIN', code);
  if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 400 });

  const jar = await cookies();
  jar.set(COOKIE_NAME, encodeRiderToken(rider.phone), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ ok: true, rider: { phone: rider.phone, name: rider.name } });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
