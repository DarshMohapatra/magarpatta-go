import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyOtp } from '@/lib/otp';

/**
 * Customer OTP signin. Verifies the code and sets mg_session. Creates the
 * User row if this phone is new — same "signin = signup" UX we had with
 * Firebase phone auth.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { phone?: string; code?: string };
  const phone = (body.phone ?? '').replace(/\D/g, '').slice(-10);
  const code = (body.code ?? '').trim();

  const v = await verifyOtp(phone, 'CUSTOMER_SIGNIN', code);
  if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 400 });

  const user = await prisma.user.upsert({
    where: { phone },
    create: { phone },
    update: {},
  });

  const token = Buffer.from(JSON.stringify({ phone: user.phone })).toString('base64url');
  const jar = await cookies();
  jar.set('mg_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ ok: true, phone: user.phone });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete('mg_session');
  return NextResponse.json({ ok: true });
}
