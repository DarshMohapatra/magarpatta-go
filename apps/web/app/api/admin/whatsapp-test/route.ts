import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';
import { notifyVendorOnWhatsApp } from '@/lib/whatsapp';

/**
 * Lightweight admin-only test ping. Fires a sample order summary to the
 * configured WHATSAPP_TEST_RECIPIENT so you can verify Twilio is wired
 * before a real customer order triggers it.
 *
 * Returns 503 with a useful message if the four env vars aren't all set.
 */
export async function POST() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const required = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_FROM', 'WHATSAPP_TEST_RECIPIENT'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Twilio not configured — missing env: ${missing.join(', ')}` },
      { status: 503 },
    );
  }

  try {
    await notifyVendorOnWhatsApp({
      orderId: 'TEST-' + Date.now().toString(36).toUpperCase(),
      vendorName: 'Magarpatta Mandi',
      slotLabel: '9 AM – 11 AM',
      slotStart: new Date(Date.now() + 12 * 60 * 60 * 1000),
      totalInr: 312,
      society: 'Heliconia',
      building: 'Lotus',
      flat: '12',
      items: [
        { name: 'Tomatoes', quantity: 2, unit: '1 kg' },
        { name: 'Onions', quantity: 1, unit: '1 kg' },
        { name: 'Coriander', quantity: 1, unit: '100g' },
      ],
    });
    return NextResponse.json({ ok: true, sentTo: process.env.WHATSAPP_TEST_RECIPIENT });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
