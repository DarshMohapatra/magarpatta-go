import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await params;
  const b = (await req.json()) as {
    supportsSelfDelivery?: boolean;
    selfDeliveryFeeInr?: number | null;
    selfDeliveryAvailable?: boolean;
    onPlatform?: boolean;
  };
  const data: Record<string, unknown> = {};
  if (typeof b.supportsSelfDelivery === 'boolean') data.supportsSelfDelivery = b.supportsSelfDelivery;
  if (b.selfDeliveryFeeInr === null || typeof b.selfDeliveryFeeInr === 'number') data.selfDeliveryFeeInr = b.selfDeliveryFeeInr;
  if (typeof b.selfDeliveryAvailable === 'boolean') data.selfDeliveryAvailable = b.selfDeliveryAvailable;
  if (typeof b.onPlatform === 'boolean') data.onPlatform = b.onPlatform;
  const vendor = await prisma.vendor.update({ where: { id }, data });
  return NextResponse.json({ ok: true, vendor });
}
