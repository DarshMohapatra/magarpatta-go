import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';

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

  if (existing.pendingRemoval) {
    return NextResponse.json({ ok: true, queued: true, alreadyQueued: true });
  }

  // The campaign stays live until admin approves the removal — admin sees it
  // on the campaigns tab right alongside edits and new submissions, so the
  // whole campaign lifecycle lives in one place.
  await prisma.campaign.update({
    where: { id },
    data: { pendingRemoval: true, pendingRemovalAt: new Date() },
  });

  return NextResponse.json({ ok: true, queued: true });
}
