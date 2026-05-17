/**
 * Single source of truth for how an order's money breaks down.
 *
 * Customer-facing rules:
 *  - Every item is listed at its MRP on product cards, cart, everywhere.
 *  - Non-regulated items (loose / prepared) carry a hidden ₹1 per-unit
 *    markup that only surfaces at checkout as a "Convenience fee" line.
 *  - Regulated packaged goods charge exactly MRP — no markup.
 *  - Tax = 5% GST on subtotal (food delivery service rate).
 *  - Delivery fee is admin-configurable (lib/settings.ts → delivery_fee_inr)
 *    and threaded in as `deliveryFeeInr`. FREEDEL coupon waives it.
 *  - Coupon discount applied after convenience + tax, before total.
 */

import type { CouponType } from '@prisma/client';

export const GIFT_WRAP_FEE = 50;
export const INSURANCE_FEE = 100;
export const TAX_RATE = 0.05;

export interface PriceableItem {
  mrpInr: number;       // displayed line price
  priceInr: number;     // what we actually charge (mrp + markup for non-reg)
  isRegulated: boolean;
  quantity: number;
}

export interface CouponInput {
  type: CouponType;
  percentOff: number | null;
  flatOffInr: number | null;
  minSubtotalInr: number;
  maxDiscountInr: number | null;
}

export interface Breakdown {
  subtotalInr: number;     // MRP-based
  convenienceInr: number;  // ₹1 × non-reg units
  taxInr: number;          // 5% of subtotal
  addOnsInr: number;       // gift wrap + insurance
  deliveryFeeInr: number;  // after FREEDEL waiver
  discountInr: number;     // coupon discount on subtotal
  membershipFeeInr: number;// plan price when this order activates a plan
  totalInr: number;
}

export interface BreakdownOpts {
  /** From SiteSetting `delivery_fee_inr` — required so we never ship a
   *  hard-coded fallback. Callers fetch via lib/settings.getDeliveryFeeInr(). */
  deliveryFeeInr: number;
  giftWrap?: boolean;
  insurance?: boolean;
  tipInr?: number;
  coupon?: CouponInput | null;
  /** Plan price when this order ALSO activates a membership. Added to the
   *  total as its own line so the customer sees what they paid for the plan
   *  separately from what they paid for the food. */
  membershipFeeInr?: number;
}

export function computeBreakdown(items: PriceableItem[], opts: BreakdownOpts): Breakdown {
  let subtotal = 0;
  let convenience = 0;

  for (const it of items) {
    subtotal += it.mrpInr * it.quantity;
    if (!it.isRegulated) {
      convenience += (it.priceInr - it.mrpInr) * it.quantity;
    }
  }

  const tip = Math.max(0, Math.floor(opts.tipInr ?? 0));
  const addOns = (opts.giftWrap ? GIFT_WRAP_FEE : 0) + (opts.insurance ? INSURANCE_FEE : 0) + tip;
  const tax = Math.round(subtotal * TAX_RATE);

  let discount = 0;
  let delivery = opts.deliveryFeeInr;

  if (opts.coupon) {
    const c = opts.coupon;
    if (subtotal >= c.minSubtotalInr) {
      if (c.type === 'PERCENT' && c.percentOff) {
        discount = Math.round((subtotal * c.percentOff) / 100);
        if (c.maxDiscountInr) discount = Math.min(discount, c.maxDiscountInr);
      } else if (c.type === 'FLAT' && c.flatOffInr) {
        discount = c.flatOffInr;
      } else if (c.type === 'FREE_DELIVERY') {
        delivery = 0;
      }
    }
  }

  const membershipFee = Math.max(0, Math.floor(opts.membershipFeeInr ?? 0));
  const total = subtotal + convenience + tax + addOns + delivery + membershipFee - discount;

  return {
    subtotalInr: subtotal,
    convenienceInr: convenience,
    taxInr: tax,
    addOnsInr: addOns,
    deliveryFeeInr: delivery,
    discountInr: discount,
    membershipFeeInr: membershipFee,
    totalInr: Math.max(0, total),
  };
}
