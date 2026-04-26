import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';
import { queueChange } from '@/lib/pending-change';

interface Body {
  title?: string;
  body?: string;
  ctaLabel?: string;
  productIds?: string[];
  discountPct?: number;
  startsAt?: string;
  endsAt?: string;
  active?: boolean;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing || existing.vendorId !== s.vendorId) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  const b = (await req.json()) as Body;
  const data: Prisma.CampaignUpdateInput = {};
  if (typeof b.title === 'string') data.title = b.title.trim();
  if (typeof b.body === 'string') data.body = b.body.trim();
  if (typeof b.ctaLabel === 'string') data.ctaLabel = b.ctaLabel.trim() || null;
  if (Array.isArray(b.productIds)) data.productIds = b.productIds.filter((x) => typeof x === 'string');
  if (typeof b.discountPct === 'number') data.discountPct = Math.max(0, Math.min(90, Math.floor(b.discountPct)));
  if (typeof b.startsAt === 'string') data.startsAt = new Date(b.startsAt);
  if (typeof b.endsAt === 'string') data.endsAt = new Date(b.endsAt);
  if (typeof b.active === 'boolean') data.active = b.active;

  // Any edit re-enters the approval queue.
  data.approvalStatus = 'PENDING';
  data.approvalNote = null;
  data.approvedAt = null;
  data.approvedBy = null;

  const campaign = await prisma.campaign.update({ where: { id }, data });
  return NextResponse.json({ ok: true, campaign });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing || existing.vendorId !== s.vendorId) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  // If still PENDING (vendor never had this approved), drop it outright —
  // there's nothing live to roll back.
  if (existing.approvalStatus !== 'APPROVED') {
    await prisma.campaign.delete({ where: { id } });
    return NextResponse.json({ ok: true, queued: false });
  }

  // Already-pending removal? Don't double-queue.
  const dupe = await prisma.pendingChange.findFirst({
    where: { entity: 'CAMPAIGN', entityId: id, operation: 'DELETE', status: 'PENDING' },
  });
  if (dupe) return NextResponse.json({ ok: true, queued: true, pendingId: dupe.id, alreadyQueued: true });

  // Hide from customers immediately so removal feels instant; the row stays
  // until admin approves the deletion.
  await prisma.campaign.update({ where: { id }, data: { active: false } });
  revalidateTag('menu');

  const change = await queueChange({
    entity: 'CAMPAIGN',
    entityId: id,
    operation: 'DELETE',
    payload: {} as never,
    before: { type: existing.type, title: existing.title } as never,
    summary: `${s.shopName} · remove campaign "${existing.title}"`,
    vendorId: s.vendorId,
  });
  return NextResponse.json({ ok: true, queued: true, pendingId: change.id });
}
