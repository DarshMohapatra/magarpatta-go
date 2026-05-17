import { NextResponse } from 'next/server';
import { getSlotAvailability, isoToday } from '@/lib/slots';

export const dynamic = 'force-dynamic';

/**
 * Customer-facing slot picker feed. ?date=YYYY-MM-DD; defaults to today.
 * Returns one row per configured slot, each annotated with booked count
 * and a `full` flag (booked >= capacity). Caller is the checkout client.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get('date') ?? isoToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }
  const slots = await getSlotAvailability(date);
  return NextResponse.json({ ok: true, date, slots });
}
