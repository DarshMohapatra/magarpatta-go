import { NextResponse } from 'next/server';

const waitlist: Array<{ phone: string; tower?: string; at: number }> = [];
export { waitlist };

const PHONE_RE = /^[6-9]\d{9}$/;

export async function POST(req: Request) {
  try {
    const { phone, tower } = await req.json();
    if (!phone || !PHONE_RE.test(phone)) {
      return NextResponse.json({ ok: false, error: 'Invalid phone' }, { status: 400 });
    }

    if (waitlist.find((w) => w.phone === phone)) {
      return NextResponse.json({ ok: true, already: true });
    }

    waitlist.push({ phone, tower, at: Date.now() });
    console.log(`[WAITLIST] +91 ${phone}${tower ? ` · ${tower}` : ''} (total: ${waitlist.length})`);

    return NextResponse.json({ ok: true, position: waitlist.length });
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ count: waitlist.length });
}
