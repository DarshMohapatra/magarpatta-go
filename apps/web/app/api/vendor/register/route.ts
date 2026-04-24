import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyOtp } from '@/lib/otp';

interface Body {
  shopName?: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  otpCode?: string;
  vendorType?: string;
  hub?: string;
  addressLine?: string;
  gstin?: string;
  fssaiNumber?: string;
  drugLicense?: string;
  panNumber?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankAccountName?: string;
  upiId?: string;
  openTime?: string;
  closeTime?: string;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

export async function POST(req: Request) {
  const b = (await req.json()) as Body;
  const shopName = (b.shopName ?? '').trim();
  const ownerName = (b.ownerName ?? '').trim();
  const ownerPhone = (b.ownerPhone ?? '').replace(/\D/g, '').slice(-10);
  const otpCode = (b.otpCode ?? '').trim();

  if (!shopName || !ownerName || ownerPhone.length !== 10) {
    return NextResponse.json(
      { ok: false, error: 'Fill shop name, owner name, and a 10-digit phone.' },
      { status: 400 },
    );
  }

  // Must verify phone via OTP before we create the pending vendor.
  const v = await verifyOtp(ownerPhone, 'VENDOR_REGISTER', otpCode);
  if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 400 });

  const existingByPhone = await prisma.vendor.findUnique({ where: { ownerPhone } });
  if (existingByPhone) {
    return NextResponse.json({ ok: false, error: 'A vendor account with this phone already exists.' }, { status: 409 });
  }

  let slug = slugify(shopName);
  for (let i = 2; i < 20; i++) {
    const clash = await prisma.vendor.findUnique({ where: { slug } });
    if (!clash) break;
    slug = `${slugify(shopName)}-${i}`;
  }

  const vendor = await prisma.vendor.create({
    data: {
      slug,
      name: shopName,
      hub: b.hub?.trim() || 'Magarpatta',
      vendorType: b.vendorType || 'restaurant',
      approvalStatus: 'PENDING',
      submittedAt: new Date(),
      ownerName,
      ownerPhone,
      ownerEmail: b.ownerEmail?.trim() || null,
      ownerPasswordHash: null,         // OTP-only — no password stored for new vendors
      addressLine: b.addressLine?.trim() || null,
      gstin: b.gstin?.trim() || null,
      fssaiNumber: b.fssaiNumber?.trim() || null,
      drugLicense: b.drugLicense?.trim() || null,
      panNumber: b.panNumber?.trim() || null,
      bankAccountNumber: b.bankAccountNumber?.trim() || null,
      bankIfsc: b.bankIfsc?.trim() || null,
      bankAccountName: b.bankAccountName?.trim() || null,
      upiId: b.upiId?.trim() || null,
      openTime: b.openTime?.trim() || null,
      closeTime: b.closeTime?.trim() || null,
      active: false,
    },
  });

  return NextResponse.json({ ok: true, vendorId: vendor.id, approvalStatus: vendor.approvalStatus });
}
