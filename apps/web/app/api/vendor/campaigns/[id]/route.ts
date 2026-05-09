import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';
import { queueChange, pickFields } from '@/lib/pending-change';
import { logActivity } from '@/lib/activity-log';

interface Body {
  title?: string;
  body?: string;
  ctaLabel?: string;
  appliesToAll?: boolean;
  productIds?: string[];
  discountPct?: number | null;
  discountFlatInr?: number | null;
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

  // Scope: if appliesToAll is touched, sync productIds; if only productIds is
  // touched, fall back to whatever scope the row already has.
  const nextAppliesToAll = typeof b.appliesToAll === 'boolean' ? b.appliesToAll : existing.appliesToAll;
  const nextProductIds = Array.isArray(b.productIds)
    ? b.productIds.filter((x) => typeof x === 'string')
    : existing.productIds;
  if (typeof b.appliesToAll === 'boolean' || Array.isArray(b.productIds)) {
    if (!nextAppliesToAll && nextProductIds.length === 0) {
      return NextResponse.json({ ok: false, error: 'Pick at least one item, or set the offer to apply to your whole menu.' }, { status: 400 });
    }
    data.appliesToAll = nextAppliesToAll;
    data.productIds = nextAppliesToAll ? [] : nextProductIds;
  }

  // Discount: explicit null clears, undefined leaves alone. The two kinds are
  // mutually exclusive — setting one nulls the other.
  const touchedPct = b.discountPct !== undefined;
  const touchedFlat = b.discountFlatInr !== undefined;
  if (touchedPct || touchedFlat) {
    const pct = typeof b.discountPct === 'number' && b.discountPct > 0
      ? Math.max(1, Math.min(90, Math.floor(b.discountPct)))
      : null;
    const flat = typeof b.discountFlatInr === 'number' && b.discountFlatInr > 0
      ? Math.max(1, Math.floor(b.discountFlatInr))
      : null;
    if (pct && flat) {
      return NextResponse.json({ ok: false, error: 'Pick either a % discount or a flat ₹ amount — not both.' }, { status: 400 });
    }
    data.discountPct = pct;
    data.discountFlatInr = flat;
  }

  if (typeof b.startsAt === 'string') data.startsAt = new Date(b.startsAt);
  if (typeof b.endsAt === 'string') data.endsAt = new Date(b.endsAt);
  if (typeof b.active === 'boolean') data.active = b.active;

  // Any edit re-enters the approval queue.
  data.approvalStatus = 'PENDING';
  data.approvalNote = null;
  data.approvedAt = null;
  data.approvedBy = null;

  const editedKeys = Object.keys(data).filter(
    (k) => !['approvalStatus', 'approvalNote', 'approvedAt', 'approvedBy'].includes(k),
  );
  const before = pickFields(existing as unknown as Record<string, unknown>, editedKeys);
  const payloadForAudit = pickFields(data as unknown as Record<string, unknown>, editedKeys);

  const campaign = await prisma.campaign.update({ where: { id }, data });

  if (editedKeys.length > 0) {
    await queueChange({
      entity: 'CAMPAIGN',
      entityId: id,
      operation: 'UPDATE',
      payload: payloadForAudit as never,
      before: before as never,
      summary: `${s.shopName} · edit campaign "${existing.title}"`,
      vendorId: s.vendorId,
    });
    await logActivity({
      actorRole: 'VENDOR',
      actorId: s.vendorId,
      actorName: s.shopName,
      action: 'CAMPAIGN_EDIT',
      summary: `${s.shopName} edited campaign "${existing.title}" (${editedKeys.length} field${editedKeys.length === 1 ? '' : 's'})`,
      metadata: { campaignId: id, fields: editedKeys },
    });
  }

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
  // whole campaign lifecycle lives in one place. The audit-log row makes it
  // visible on the Changes tab as well.
  await prisma.campaign.update({
    where: { id },
    data: { pendingRemoval: true, pendingRemovalAt: new Date() },
  });

  await queueChange({
    entity: 'CAMPAIGN',
    entityId: id,
    operation: 'DELETE',
    payload: {} as never,
    before: { title: existing.title, type: existing.type, active: existing.active } as never,
    summary: `${s.shopName} · remove campaign "${existing.title}"`,
    vendorId: s.vendorId,
  });

  await logActivity({
    actorRole: 'VENDOR',
    actorId: s.vendorId,
    actorName: s.shopName,
    action: 'CAMPAIGN_REMOVE_REQUEST',
    summary: `${s.shopName} requested removal of campaign "${existing.title}"`,
    metadata: { campaignId: id },
  });

  return NextResponse.json({ ok: true, queued: true });
}
