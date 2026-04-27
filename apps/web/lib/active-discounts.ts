import 'server-only';
import { prisma } from './prisma';

export interface ActiveCampaignDiscount {
  id: string;
  vendorId: string;
  productIds: string[];   // empty = applies to all of the vendor's products
  discountPct: number;
  type: string;           // CampaignType (kept loose for Json transport)
  title: string;
}

export async function getActiveDiscounts(): Promise<ActiveCampaignDiscount[]> {
  const now = new Date();
  const campaigns = await prisma.campaign.findMany({
    where: {
      approvalStatus: 'APPROVED',
      active: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
      discountPct: { not: null, gt: 0 },
      vendor: { active: true, approvalStatus: 'APPROVED' },
    },
    select: { id: true, vendorId: true, productIds: true, discountPct: true, type: true, title: true },
  });
  return campaigns
    .filter((c) => c.discountPct != null && c.discountPct > 0)
    .map((c) => ({
      id: c.id,
      vendorId: c.vendorId,
      productIds: c.productIds,
      discountPct: c.discountPct as number,
      type: c.type as string,
      title: c.title,
    }));
}

/**
 * Pick the highest applicable discount for a single product. Regulated MRP
 * goods are excluded — Legal Metrology forbids selling below printed MRP.
 * Returns the matching campaign so callers can surface its label in the cart.
 */
export function discountFor(
  product: { id: string; vendorId: string; isRegulated: boolean },
  campaigns: ActiveCampaignDiscount[],
): { pct: number; campaign: ActiveCampaignDiscount | null } {
  if (product.isRegulated) return { pct: 0, campaign: null };
  let best: ActiveCampaignDiscount | null = null;
  for (const c of campaigns) {
    if (c.vendorId !== product.vendorId) continue;
    const matches = c.productIds.length === 0 || c.productIds.includes(product.id);
    if (!matches) continue;
    if (!best || c.discountPct > best.discountPct) best = c;
  }
  return { pct: best?.discountPct ?? 0, campaign: best };
}

/**
 * Apply a discount to one product's pricing. The original MRP becomes the
 * "was" line; both `mrpInr` and `priceInr` collapse to the discounted price
 * so the +₹1 convenience markup is dropped during a sale.
 */
export function applyDiscount(
  product: { priceInr: number; mrpInr: number | null; isRegulated: boolean },
  pct: number,
): { priceInr: number; mrpInr: number | null; originalMrpInr: number | null; discountPct: number } {
  if (pct <= 0 || product.isRegulated) {
    return { priceInr: product.priceInr, mrpInr: product.mrpInr, originalMrpInr: null, discountPct: 0 };
  }
  const baseMrp = product.mrpInr ?? product.priceInr;
  const discounted = Math.max(1, Math.round(baseMrp * (1 - pct / 100)));
  return {
    priceInr: discounted,
    mrpInr: discounted,
    originalMrpInr: baseMrp,
    discountPct: pct,
  };
}
