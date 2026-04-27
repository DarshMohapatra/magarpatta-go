import { NextResponse } from 'next/server';
import type { CampaignType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';

const VALID_TYPES: CampaignType[] = [
  'NEW_OPENING', 'FLASH_SALE', 'FESTIVAL', 'LATE_NIGHT',
  'WEEKEND', 'BOGO', 'EARLY_BIRD', 'TIFFIN_SERVICE',
];

export async function GET() {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const [campaigns, pendingRemovals] = await Promise.all([
    prisma.campaign.findMany({
      where: { vendorId: s.vendorId },
      orderBy: [{ active: 'desc' }, { endsAt: 'desc' }],
    }),
    prisma.pendingChange.findMany({
      where: {
        vendorId: s.vendorId,
        entity: 'CAMPAIGN',
        operation: 'DELETE',
        status: 'PENDING',
      },
      select: { entityId: true },
    }),
  ]);
  const pendingRemovalIds = pendingRemovals.map((p) => p.entityId).filter((x): x is string => !!x);
  return NextResponse.json({ ok: true, campaigns, pendingRemovalIds });
}

interface Body {
  type?: string;
  title?: string;
  body?: string;
  ctaLabel?: string;
  productIds?: string[];
  discountPct?: number;
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

  const data: Prisma.CampaignUncheckedCreateInput = {
    vendorId: s.vendorId,
    type,
    title,
    body,
    ctaLabel: b.ctaLabel?.trim() || null,
    productIds: Array.isArray(b.productIds) ? b.productIds.filter((x) => typeof x === 'string') : [],
    discountPct: typeof b.discountPct === 'number' ? Math.max(0, Math.min(90, Math.floor(b.discountPct))) : null,
    startsAt,
    endsAt,
    active: b.active ?? true,
    approvalStatus: 'PENDING',
  };

  const campaign = await prisma.campaign.create({ data });
  return NextResponse.json({ ok: true, campaign });
}
