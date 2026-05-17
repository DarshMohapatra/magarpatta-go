import { NextResponse } from 'next/server';
import type { PaymentMethod } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCustomerScope } from '@/lib/customer-scope';
// status only advances via vendor/rider actions — no demo auto-progression
import { computeBreakdown } from '@/lib/pricing';
import { getDeliveryFeeInr, getSlotDefinitions } from '@/lib/settings';
import { applyDiscount, discountFor, getActiveDiscounts } from '@/lib/active-discounts';
import { getCodEligibility, COD_MAX_ORDER_INR } from '@/lib/cod';
import { resolveAvailability } from '@/lib/product-availability';
import { materialiseSlot, parseDateIso } from '@/lib/slots';
import { getMembershipState, resolveDeliveryFee, debitCreditForOrder } from '@/lib/membership';

interface IncomingItem {
  productId: string;
  quantity: number;
}

interface IncomingBody {
  items: IncomingItem[];
  notes?: string;
  paymentMethod?: PaymentMethod;
  addressId?: string;
  giftWrap?: boolean;
  insurance?: boolean;
  tipInr?: number;
  deliveryMode?: string;
  couponCode?: string;
  /** 'ORDER_NOW' or 'SLOTTED'. Defaults to 'ORDER_NOW' for backwards-compat. */
  deliveryWindow?: 'ORDER_NOW' | 'SLOTTED';
  /** Required when deliveryWindow === 'SLOTTED'. */
  deliverySlotId?: string;
  /** Required when deliveryWindow === 'SLOTTED'. YYYY-MM-DD. */
  deliverySlotDate?: string;
}

export async function POST(req: Request) {
  const scope = await getCustomerScope();
  if (!scope) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { session, userId, db } = scope;

  if (session.addresses.length === 0) {
    return NextResponse.json({ ok: false, error: 'Set a delivery address before placing an order' }, { status: 400 });
  }

  try {
    const body = (await req.json()) as IncomingBody;
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ ok: false, error: 'Cart is empty' }, { status: 400 });
    }

    // Resolve the delivery address from the user's saved list. The client
    // sends an addressId; if it doesn't, fall back to the default. We never
    // trust client-supplied society/building/flat strings — always read them
    // off the saved address record.
    const address =
      session.addresses.find((a) => a.id === body.addressId) ??
      session.addresses.find((a) => a.isDefault) ??
      session.addresses[0];
    if (!address) {
      return NextResponse.json({ ok: false, error: 'Set a delivery address before placing an order' }, { status: 400 });
    }

    const paymentMethod = body.paymentMethod ?? 'COD';

    // Catalog reads use the raw prisma client — products and coupons are
    // public and the scoped client doesn't gate them.
    const productIds = body.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { vendor: true },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json({ ok: false, error: 'Some items are no longer available' }, { status: 400 });
    }

    // Apply today's vendor-set overrides — they're the live source of truth
    // for price + stock. Anything OOS via override blocks placement.
    const availability = await resolveAvailability(
      products.map((p) => ({ id: p.id, priceInr: p.priceInr, mrpInr: p.mrpInr, inStock: p.inStock })),
    );
    const oosNames = products
      .filter((p) => !(availability.get(p.id)?.inStock ?? p.inStock))
      .map((p) => p.name);
    if (oosNames.length > 0) {
      return NextResponse.json(
        { ok: false, error: `Out of stock: ${oosNames.join(', ')}. Remove these and try again.` },
        { status: 400 },
      );
    }

    // Single-hub enforcement: cart may mix vendors, but only within the same
    // hub (so a rider picks up from one place, not across the township).
    const distinctHubs = new Set(products.map((p) => p.vendor.hub));
    if (distinctHubs.size > 1) {
      return NextResponse.json(
        { ok: false, error: 'Your cart has items from multiple hubs. Split into separate orders — a rider can only pick up from one hub per trip.' },
        { status: 400 },
      );
    }

    // Re-derive every line price from the live catalogue + active campaigns
    // so a customer can't pin stale (pre-discount or pre-hike) prices in
    // their cart.
    const activeDiscounts = await getActiveDiscounts();
    const byId = new Map(products.map((p) => [p.id, p]));
    let cartHasCampaign = false;
    const priceItems = body.items.map((i) => {
      const p = byId.get(i.productId)!;
      const eff = availability.get(p.id)!;
      // Daily override wins for both price + mrp. Discounts apply on top.
      const basePrice = eff.priceInr;
      const baseMrp = eff.mrpInr;
      const qty = Math.max(1, Math.floor(i.quantity));
      const match = discountFor({ id: p.id, vendorId: p.vendorId, isRegulated: p.isRegulated, priceInr: basePrice, mrpInr: baseMrp }, activeDiscounts);
      const priced = applyDiscount({ priceInr: basePrice, mrpInr: baseMrp, isRegulated: p.isRegulated }, match.saving, match.campaign);
      if (match.saving > 0) cartHasCampaign = true;
      return {
        mrpInr: priced.mrpInr ?? priced.priceInr,
        priceInr: priced.priceInr,
        isRegulated: p.isRegulated,
        quantity: qty,
        product: p,
      };
    });

    // No coupon stacking on top of an active campaign — the discount is
    // already baked into the line prices.
    if (cartHasCampaign && body.couponCode) {
      return NextResponse.json(
        { ok: false, error: 'A campaign discount is already applied — coupons can’t stack on top.' },
        { status: 400 },
      );
    }

    // Validate + load coupon (public catalog read)
    let coupon = null as Awaited<ReturnType<typeof prisma.coupon.findUnique>> | null;
    if (body.couponCode) {
      coupon = await prisma.coupon.findUnique({ where: { code: body.couponCode.toUpperCase().trim() } });
      if (!coupon || !coupon.active) {
        return NextResponse.json({ ok: false, error: 'Invalid coupon' }, { status: 400 });
      }
      if (coupon.validUntil && coupon.validUntil < new Date()) {
        return NextResponse.json({ ok: false, error: 'This coupon has expired' }, { status: 400 });
      }
    }

    // Delivery fee = (member with credits → 0) | (member, no credits →
    // postIncludedFeeInr) | (non-member → settings.delivery_fee_inr).
    const [standardFeeInr, membership] = await Promise.all([
      getDeliveryFeeInr(),
      getMembershipState(userId),
    ]);
    const feeCtx = resolveDeliveryFee(membership, standardFeeInr);

    const breakdown = computeBreakdown(
      priceItems.map((i) => ({ mrpInr: i.mrpInr, priceInr: i.priceInr, isRegulated: i.isRegulated, quantity: i.quantity })),
      {
        deliveryFeeInr: feeCtx.feeInr,
        giftWrap: body.giftWrap,
        insurance: body.insurance,
        tipInr: body.tipInr,
        coupon: coupon
          ? {
              type: coupon.type,
              percentOff: coupon.percentOff,
              flatOffInr: coupon.flatOffInr,
              minSubtotalInr: coupon.minSubtotalInr,
              maxDiscountInr: coupon.maxDiscountInr,
            }
          : null,
      },
    );

    // Resolve the chosen delivery window into stable absolute timestamps so
    // the order row is self-contained (and reports don't rely on the live
    // settings.slot_definitions list).
    let slotSnapshot: { id: string; label: string; start: Date; end: Date } | null = null;
    const windowKind = body.deliveryWindow ?? 'ORDER_NOW';
    if (windowKind === 'SLOTTED') {
      if (!body.deliverySlotId || !body.deliverySlotDate) {
        return NextResponse.json({ ok: false, error: 'Slot id and date are required for slotted delivery' }, { status: 400 });
      }
      const defs = await getSlotDefinitions();
      const def = defs.find((d) => d.id === body.deliverySlotId);
      if (!def) {
        return NextResponse.json({ ok: false, error: 'That slot is no longer available' }, { status: 400 });
      }
      const dateIso = body.deliverySlotDate;
      const { start, end } = materialiseSlot(def, dateIso);
      // Reject past windows. Same-day past slots default to a useful message.
      if (end.getTime() < Date.now()) {
        return NextResponse.json({ ok: false, error: 'That slot has already passed. Pick a later window.' }, { status: 400 });
      }
      // Re-anchor the date arg so the YYYY-MM-DD validator runs.
      parseDateIso(dateIso);
      slotSnapshot = { id: def.id, label: def.label, start, end };
    }

    if (coupon && breakdown.discountInr === 0 && breakdown.deliveryFeeInr !== 0) {
      return NextResponse.json(
        { ok: false, error: `Add ₹${coupon.minSubtotalInr - breakdown.subtotalInr} more to use ${coupon.code}` },
        { status: 400 },
      );
    }

    if (paymentMethod === 'COD') {
      const cod = await getCodEligibility(db);
      if (!cod.eligible) {
        const remaining = Math.max(1, cod.threshold - cod.prepaidCount);
        return NextResponse.json(
          { ok: false, error: `Pay online for ${remaining} more order${remaining === 1 ? '' : 's'} to unlock cash on delivery.` },
          { status: 400 },
        );
      }
      if (breakdown.totalInr > COD_MAX_ORDER_INR) {
        return NextResponse.json(
          { ok: false, error: `Cash on delivery is capped at ₹${COD_MAX_ORDER_INR}. Pay online for orders above this amount.` },
          { status: 400 },
        );
      }
    }

    // Two flows, nothing more:
    //   every vendor supports self-delivery  → VENDOR_SELF      (vendor sees + delivers themselves)
    //   else                                 → PLATFORM_RIDER   (concierge: vendor NOT notified; our rider
    //                                                            walks into the shop, places the order at
    //                                                            the counter, pays, brings it to the customer)
    // If a vendor has self-delivery on, all their orders go to them — no "busy team" fallback.
    const vendorsInCart = [...new Map(products.map((p) => [p.vendor.id, p.vendor])).values()];
    const everyVendorSelfDelivers =
      vendorsInCart.length > 0 && vendorsInCart.every((v) => v.supportsSelfDelivery);
    const fulfilmentMode = everyVendorSelfDelivers ? 'VENDOR_SELF' : 'PLATFORM_RIDER';
    const primaryVendor = products[0].vendor;
    const hub = primaryVendor.hub;

    // db.order.create auto-injects userId from the scope — the explicit
    // userId field below is illustrative only; the wrapper would override
    // anything we put here.
    const order = await db.order.create({
      data: {
        userId,
        vendorId: primaryVendor.id,
        status: 'PLACED',
        paymentMethod,
        hub,
        fulfilmentMode,
        society: address.society,
        building: address.building,
        flat: address.flat,
        subtotalInr: breakdown.subtotalInr,
        convenienceInr: breakdown.convenienceInr,
        taxInr: breakdown.taxInr,
        addOnsInr: breakdown.addOnsInr,
        deliveryFeeInr: breakdown.deliveryFeeInr,
        discountInr: breakdown.discountInr,
        couponCode: coupon?.code ?? null,
        totalInr: breakdown.totalInr,
        giftWrap: Boolean(body.giftWrap),
        insurance: Boolean(body.insurance),
        deliveryMode: body.deliveryMode ?? 'standard',
        deliveryWindow: windowKind,
        deliverySlotId: slotSnapshot?.id ?? null,
        deliverySlotLabel: slotSnapshot?.label ?? null,
        deliverySlotStart: slotSnapshot?.start ?? null,
        deliverySlotEnd: slotSnapshot?.end ?? null,
        subscriptionId: feeCtx.subscriptionId,
        deliveryCreditUsed: feeCtx.debitCredit,
        vendorName: primaryVendor.name,
        vendorHub: primaryVendor.hub,
        notes: body.notes ?? null,
        items: {
          create: priceItems.map((i) => ({
            productId: i.product.id,
            name: i.product.name,
            vendorName: i.product.vendor.name,
            unit: i.product.unit,
            priceInr: i.priceInr,
            mrpInr: i.mrpInr,
            isRegulated: i.isRegulated,
            quantity: i.quantity,
            accent: i.product.accent,
            glyph: i.product.glyph,
            imageUrl: i.product.imageUrl,
          })),
        },
      },
    });

    if (coupon) {
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { usageCount: { increment: 1 } },
      });
    }

    if (feeCtx.debitCredit && feeCtx.subscriptionId) {
      await debitCreditForOrder(feeCtx.subscriptionId, order.id);
    }

    return NextResponse.json({ ok: true, orderId: order.id });
  } catch (e) {
    console.error('[orders] POST failed:', e);
    return NextResponse.json({ ok: false, error: (e as Error).message || 'Could not place order' }, { status: 500 });
  }
}

export async function GET() {
  const scope = await getCustomerScope();
  if (!scope) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  // db.order.findMany auto-applies userId — even an empty `where` is safe.
  const orders = await scope.db.order.findMany({
    orderBy: { placedAt: 'desc' },
    include: { items: { select: { name: true, quantity: true, imageUrl: true, accent: true, glyph: true } } },
  });

  return NextResponse.json({ ok: true, orders });
}
