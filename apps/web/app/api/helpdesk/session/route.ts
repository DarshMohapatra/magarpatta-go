import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyOtp } from '@/lib/otp';
import { HELPDESK_COOKIE, encodeHelpdeskToken } from '@/lib/helpdesk-session';
import { siteConfig } from '@/lib/site-config';

export async function POST(req: Request) {
  const body = (await req.json()) as { phone?: string; code?: string };
  const phone = (body.phone ?? '').replace(/\D/g, '').slice(-10);
  const code = (body.code ?? '').trim();

  // Demo bootstrap: auto-provision the seeded helpdesk phone if its row doesn't
  // exist yet (avoids a manual seed on prod). Remove this block before launch
  // — real helpdesk staff get added via an admin-only API.
  const SEEDED_AGENTS: Record<string, string> = {
    [siteConfig.demoHelpdeskPhone]: `${siteConfig.siteName} Helpdesk`,
  };
  let agent = await prisma.supportAgent.findUnique({ where: { phone } });
  if (!agent && SEEDED_AGENTS[phone]) {
    agent = await prisma.supportAgent.create({
      data: { phone, name: SEEDED_AGENTS[phone], active: true },
    });
  }
  if (!agent || !agent.active) {
    return NextResponse.json({ ok: false, error: 'No helpdesk account on that phone.' }, { status: 401 });
  }

  const v = await verifyOtp(phone, 'HELPDESK_SIGNIN', code);
  if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 400 });

  const jar = await cookies();
  jar.set(HELPDESK_COOKIE, encodeHelpdeskToken(phone), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true, agent: { name: agent.name } });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(HELPDESK_COOKIE);
  return NextResponse.json({ ok: true });
}
