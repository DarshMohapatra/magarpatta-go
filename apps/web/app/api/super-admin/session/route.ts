import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SUPER_COOKIE, checkPasswordHash, encodeSuperToken } from '@/lib/super-admin-session';

export async function POST(req: Request) {
  const expectedPhone = process.env.SUPER_ADMIN_PHONE?.trim();
  const expectedHash = process.env.SUPER_ADMIN_PASSWORD_HASH?.trim();

  if (!expectedPhone || !expectedHash) {
    return NextResponse.json(
      { ok: false, error: 'Super-admin not configured on this deployment' },
      { status: 503 },
    );
  }

  let body: { phone?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 });
  }

  const phone = (body.phone ?? '').replace(/\D/g, '').slice(-10);
  const password = (body.password ?? '').trim();

  if (phone !== expectedPhone || !checkPasswordHash(password, expectedHash)) {
    // Same error for both — never leak whether the phone existed.
    return NextResponse.json({ ok: false, error: 'Wrong phone or password' }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(SUPER_COOKIE, encodeSuperToken(phone), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours — short, since super-admin is high-blast-radius
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(SUPER_COOKIE);
  return NextResponse.json({ ok: true });
}
