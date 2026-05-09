import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyOtp } from '@/lib/otp';
import { CURATOR_COOKIE, encodeCuratorToken } from '@/lib/curator-session';
import { siteConfig } from '@/lib/site-config';

export async function POST(req: Request) {
  const body = (await req.json()) as { phone?: string; code?: string };
  const phone = (body.phone ?? '').replace(/\D/g, '').slice(-10);
  const code = (body.code ?? '').trim();

  // Demo bootstrap: auto-provision the seeded curator phone if its row doesn't
  // exist yet (avoids a manual seed on prod). Remove this block before launch
  // — real curators get added via an admin-only API.
  const SEEDED_CURATORS: Record<string, string> = {
    [siteConfig.demoCuratorPhone]: `${siteConfig.siteName} Curator`,
  };
  let curator = await prisma.curator.findUnique({ where: { phone } });
  if (!curator && SEEDED_CURATORS[phone]) {
    curator = await prisma.curator.create({
      data: { phone, name: SEEDED_CURATORS[phone], active: true },
    });
  }
  if (!curator || !curator.active) {
    return NextResponse.json({ ok: false, error: 'No curator account on that phone.' }, { status: 401 });
  }

  const v = await verifyOtp(phone, 'CURATOR_SIGNIN', code);
  if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 400 });

  const jar = await cookies();
  jar.set(CURATOR_COOKIE, encodeCuratorToken(phone), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true, curator: { name: curator.name } });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(CURATOR_COOKIE);
  return NextResponse.json({ ok: true });
}
