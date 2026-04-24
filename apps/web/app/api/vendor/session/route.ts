import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { encodeVendorToken, VENDOR_COOKIE } from '@/lib/vendor-session';

export async function POST(req: Request) {
  const body = (await req.json()) as { phone?: string; password?: string };
  const phone = (body.phone ?? '').replace(/\D/g, '').slice(-10);
  const password = (body.password ?? '').trim();
  if (phone.length !== 10 || !password) {
    return NextResponse.json({ ok: false, error: 'Phone and password required.' }, { status: 400 });
  }

  const vendor = await prisma.vendor.findUnique({ where: { ownerPhone: phone } });
  if (!vendor || !vendor.ownerPasswordHash) {
    return NextResponse.json({ ok: false, error: 'No vendor account on that phone.' }, { status: 401 });
  }
  if (!verifyPassword(password, vendor.ownerPasswordHash)) {
    return NextResponse.json({ ok: false, error: 'Wrong password.' }, { status: 401 });
  }
  if (vendor.approvalStatus === 'REJECTED') {
    return NextResponse.json({ ok: false, error: 'Your vendor application was rejected. Contact support.' }, { status: 403 });
  }
  if (vendor.approvalStatus === 'SUSPENDED') {
    return NextResponse.json({ ok: false, error: 'Your shop is suspended. Contact support.' }, { status: 403 });
  }

  const jar = await cookies();
  jar.set(VENDOR_COOKIE, encodeVendorToken(phone), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({
    ok: true,
    vendor: {
      id: vendor.id,
      shopName: vendor.name,
      approvalStatus: vendor.approvalStatus,
    },
  });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(VENDOR_COOKIE);
  return NextResponse.json({ ok: true });
}
