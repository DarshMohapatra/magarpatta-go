import 'server-only';
import { prisma } from './prisma';

export interface ActiveCampaignDiscount {
  id: string;
  vendorId: string;
  appliesToAll: boolean;
  productIds: string[];
  discountPct: number | null;
  discountFlatInr: number | null;
  type: string;           // CampaignType (kept loose for Json transport)
  title: string;
}

/** Saving in rupees a campaign would yield on a single product (price floor: ₹1). */
function savingFor(price: number, c: ActiveCampaignDiscount): number {
  if (c.discountPct && c.discountPct > 0) {
    return Math.floor((price * c.discountPct) / 100);
  }
  if (c.discountFlatInr && c.discountFlatInr > 0) {
    return Math.min(c.discountFlatInr, Math.max(0, price - 1));
  }
  return 0;
}

export async function getActiveDiscounts(): Promise<ActiveCampaignDiscount[]> {
  const now = new Date();
  const campaigns = await prisma.campaign.findMany({
    where: {
      approvalStatus: 'APPROVED',
      active: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
      OR: [
        { discountPct: { not: null, gt: 0 } },
        { discountFlatInr: { not: null, gt: 0 } },
      ],
      vendor: { active: true, approvalStatus: 'APPROVED' },
    },
    select: {
      id: true,
      vendorId: true,
      appliesToAll: true,
      productIds: true,
      discountPct: true,
      discountFlatInr: true,
      type: true,
      title: true,
    },
  });
  return campaigns.map((c) => ({
    id: c.id,
    vendorId: c.vendorId,
    appliesToAll: c.appliesToAll,
    productIds: c.productIds,
    discountPct: c.discountPct,
    discountFlatInr: c.discountFlatInr,
    type: c.type as string,
    title: c.title,
  }));
}

/**
 * Pick the highest applicable discount for a single product. Regulated MRP
 * goods are excluded — Legal Metrology forbids selling below printed MRP.
 * When mixing % and ₹ campaigns, the comparison uses the rupee saving on this
 * specific product so the customer always gets the bigger break.
 */
export function discountFor(
  product: { id: string; vendorId: string; isRegulated: boolean; priceInr: number; mrpInr: number | null },
  campaigns: ActiveCampaignDiscount[],
): { saving: number; campaign: ActiveCampaignDiscount | null } {
  if (product.isRegulated) return { saving: 0, campaign: null };
  const baseMrp = product.mrpInr ?? product.priceInr;
  let best: ActiveCampaignDiscount | null = null;
  let bestSaving = 0;
  for (const c of campaigns) {
    if (c.vendorId !== product.vendorId) continue;
    const matches = c.appliesToAll || c.productIds.includes(product.id);
    if (!matches) continue;
    const saving = savingFor(baseMrp, c);
    if (saving > bestSaving) {
      bestSaving = saving;
      best = c;
    }
  }
  return { saving: bestSaving, campaign: best };
}

/**
 * Apply a discount to one product's pricing. The original MRP becomes the
 * "was" line; both `mrpInr` and `priceInr` collapse to the discounted price
 * so the +₹1 convenience markup is dropped during a sale.
 */
export function applyDiscount(
  product: { priceInr: number; mrpInr: number | null; isRegulated: boolean },
  saving: number,
  campaign: ActiveCampaignDiscount | null,
): { priceInr: number; mrpInr: number | null; originalMrpInr: number | null; discountPct: number; discountFlatInr: number | null } {
  if (saving <= 0 || product.isRegulated || !campaign) {
    return { priceInr: product.priceInr, mrpInr: product.mrpInr, originalMrpInr: null, discountPct: 0, discountFlatInr: null };
  }
  const baseMrp = product.mrpInr ?? product.priceInr;
  const discounted = Math.max(1, baseMrp - saving);
  return {
    priceInr: discounted,
    mrpInr: discounted,
    originalMrpInr: baseMrp,
    discountPct: campaign.discountPct ?? 0,
    discountFlatInr: campaign.discountFlatInr ?? null,
  };
}
