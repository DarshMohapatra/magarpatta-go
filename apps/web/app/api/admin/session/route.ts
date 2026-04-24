import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { ADMIN_COOKIE, encodeAdminToken } from '@/lib/admin-session';

export async function POST(req: Request) {
  const body = (await req.json()) as { phone?: string; password?: string };
  const phone = (body.phone ?? '').replace(/\D/g, '').slice(-10);
  const password = (body.password ?? '').trim();
  if (phone.length !== 10 || !password) {
    return NextResponse.json({ ok: false, error: 'Phone and password required.' }, { status: 400 });
  }

  const admin = await prisma.admin.findUnique({ where: { phone } });
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    return NextResponse.json({ ok: false, error: 'Invalid credentials.' }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, encodeAdminToken(phone), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true, admin: { name: admin.name, role: admin.role } });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  return NextResponse.json({ ok: true });
}
