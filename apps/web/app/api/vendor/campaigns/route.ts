import { NextResponse } from 'next/server';
import type { CampaignType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';
import { queueChange } from '@/lib/pending-change';
import { logActivity } from '@/lib/activity-log';

const VALID_TYPES: CampaignType[] = [
  'NEW_OPENING', 'FLASH_SALE', 'FESTIVAL', 'LATE_NIGHT',
  'WEEKEND', 'BOGO', 'EARLY_BIRD', 'TIFFIN_SERVICE',
];

export async function GET() {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const campaigns = await prisma.campaign.findMany({
    where: { vendorId: s.vendorId },
    orderBy: [{ active: 'desc' }, { endsAt: 'desc' }],
  });
  return NextResponse.json({ ok: true, campaigns });
}

interface Body {
  type?: string;
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

export async function POST(req: Request) {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (s.approvalStatus !== 'APPROVED') {
    return NextResponse.json({ ok: false, error: 'Shop is not yet approved.' }, { status: 403 });
  }

  const b = (await req.json()) as Body;
  const type = b.type as CampaignType;
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ ok: false, error: 'Invalid campaign type' }, { status: 400 });
  }
  const title = (b.title ?? '').trim();
  const body = (b.body ?? '').trim();
  const startsAt = b.startsAt ? new Date(b.startsAt) : null;
  const endsAt = b.endsAt ? new Date(b.endsAt) : null;
  if (!title || !body || !startsAt || !endsAt) {
    return NextResponse.json({ ok: false, error: 'Title, body, start, and end are required.' }, { status: 400 });
  }
  if (endsAt <= startsAt) {
    return NextResponse.json({ ok: false, error: 'End must be after start.' }, { status: 400 });
  }

  const appliesToAll = b.appliesToAll !== false;
  const productIds = Array.isArray(b.productIds) ? b.productIds.filter((x) => typeof x === 'string') : [];
  if (!appliesToAll && productIds.length === 0) {
    return NextResponse.json({ ok: false, error: 'Pick at least one item, or set the offer to apply to your whole menu.' }, { status: 400 });
  }

  const discountPct = typeof b.discountPct === 'number' && b.discountPct > 0
    ? Math.max(1, Math.min(90, Math.floor(b.discountPct)))
    : null;
  const discountFlatInr = typeof b.discountFlatInr === 'number' && b.discountFlatInr > 0
    ? Math.max(1, Math.floor(b.discountFlatInr))
    : null;
  if (discountPct && discountFlatInr) {
    return NextResponse.json({ ok: false, error: 'Pick either a % discount or a flat ₹ amount — not both.' }, { status: 400 });
  }

  const data: Prisma.CampaignUncheckedCreateInput = {
    vendorId: s.vendorId,
    type,
    title,
    body,
    ctaLabel: b.ctaLabel?.trim() || null,
    appliesToAll,
    productIds: appliesToAll ? [] : productIds,
    discountPct,
    discountFlatInr,
    startsAt,
    endsAt,
    active: b.active ?? true,
    approvalStatus: 'PENDING',
  };

  const campaign = await prisma.campaign.create({ data });

  await queueChange({
    entity: 'CAMPAIGN',
    entityId: campaign.id,
    operation: 'CREATE',
    payload: {
      type: campaign.type,
      title: campaign.title,
      body: campaign.body,
      ctaLabel: campaign.ctaLabel,
      appliesToAll: campaign.appliesToAll,
      productIds: campaign.productIds,
      discountPct: campaign.discountPct,
      discountFlatInr: campaign.discountFlatInr,
      startsAt: campaign.startsAt.toISOString(),
      endsAt: campaign.endsAt.toISOString(),
      active: campaign.active,
    } as never,
    summary: `${s.shopName} · new campaign "${campaign.title}"`,
    vendorId: s.vendorId,
  });

  await logActivity({
    actorRole: 'VENDOR',
    actorId: s.vendorId,
    actorName: s.shopName,
    action: 'CAMPAIGN_CREATE',
    summary: `${s.shopName} submitted campaign "${campaign.title}"`,
    metadata: { campaignId: campaign.id, type: campaign.type },
  });

  return NextResponse.json({ ok: true, campaign });
}
