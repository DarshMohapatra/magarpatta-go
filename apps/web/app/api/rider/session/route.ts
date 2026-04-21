import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { findRider } from '@/lib/riders';
import { encodeRiderToken, COOKIE_NAME } from '@/lib/rider-session';

export async function POST(req: Request) {
  const body = (await req.json()) as { phone?: string };
  const phone = (body.phone ?? '').replace(/\D/g, '').slice(-10);
  const rider = findRider(phone);
  if (!rider) {
    return NextResponse.json(
      { ok: false, error: 'This phone is not on the Magarpatta rider roster.' },
      { status: 401 },
    );
  }
  const jar = await cookies();
  jar.set(COOKIE_NAME, encodeRiderToken(rider), {
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
