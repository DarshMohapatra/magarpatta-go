import { NextResponse } from 'next/server';
import { sendOtp, type OtpPurpose } from '@/lib/otp';

const VALID: OtpPurpose[] = [
  'CUSTOMER_SIGNIN',
  'VENDOR_SIGNIN',
  'VENDOR_REGISTER',
  'RIDER_SIGNIN',
  'RIDER_REGISTER',
  'ADMIN_SIGNIN',
];

export async function POST(req: Request) {
  const body = (await req.json()) as { phone?: string; purpose?: string };
  const phone = (body.phone ?? '').replace(/\D/g, '').slice(-10);
  const purpose = body.purpose as OtpPurpose;
  if (!VALID.includes(purpose)) {
    return NextResponse.json({ ok: false, error: 'Bad purpose.' }, { status: 400 });
  }
  const res = await sendOtp(phone, purpose);
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true, demoOtp: res.demoOtp, smsSent: res.smsSent });
}
