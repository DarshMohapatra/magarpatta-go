import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const PHONE_RE = /^[6-9]\d{9}$/;

export async function POST(req: Request) {
  try {
    const { phone, tower, society, building, flat, source } = await req.json();

    if (!phone || !PHONE_RE.test(phone)) {
      return NextResponse.json({ ok: false, error: 'Invalid phone' }, { status: 400 });
    }

    const existing = await prisma.waitlistEntry.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json({ ok: true, already: true });
    }

    const resolvedSociety = society ?? tower ?? null;

    await prisma.waitlistEntry.create({
      data: {
        phone,
        society: resolvedSociety,
        building: building ?? null,
        flat: flat ?? null,
        source: source ?? 'landing_cta',
      },
    });

    const position = await prisma.waitlistEntry.count();
    console.log(`[WAITLIST] +91 ${phone}${resolvedSociety ? ` · ${resolvedSociety}` : ''} (total: ${position})`);

    return NextResponse.json({ ok: true, position });
  } catch (e) {
    console.error('[waitlist] POST failed:', e);
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}

export async function GET() {
  const count = await prisma.waitlistEntry.count();
  return NextResponse.json({ count });
}
