import 'server-only';
import { prisma } from './prisma';
import type { Subscription, MembershipPlan, MembershipTopUp } from '@prisma/client';

/**
 * Membership state for the active customer. The order pricer and account
 * pages go through these helpers so the credit-counting math lives in one
 * place. Credits = sum of deltaDeliveries in the ledger for the active
 * subscription (GRANT/TOPUP add, DEBIT subtracts, REFUND adds back).
 */

export interface MembershipState {
  subscription: Subscription | null;
  creditsLeft: number;
  /** How many credits were granted in the current cycle (GRANT + TOPUP). */
  creditsGranted: number;
  /** True if subscription is ACTIVE and cycleEnd is still in the future. */
  isActive: boolean;
}

export async function getMembershipState(userId: string, now: Date = new Date()): Promise<MembershipState> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { cycleEnd: 'desc' },
  });
  if (!sub) {
    return { subscription: null, creditsLeft: 0, creditsGranted: 0, isActive: false };
  }
  const expired = sub.cycleEnd <= now;
  if (expired) {
    // Lazy expiry — flip the row so we don't keep returning it as ACTIVE.
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'EXPIRED' },
    });
    await prisma.subscriptionLedger.create({
      data: {
        subscriptionId: sub.id,
        type: 'EXPIRE',
        deltaDeliveries: 0,
        note: 'Cycle ended',
      },
    });
    return { subscription: null, creditsLeft: 0, creditsGranted: 0, isActive: false };
  }

  const ledger = await prisma.subscriptionLedger.aggregate({
    where: { subscriptionId: sub.id },
    _sum: { deltaDeliveries: true },
  });
  const creditsLeft = ledger._sum.deltaDeliveries ?? 0;

  const grantedAgg = await prisma.subscriptionLedger.aggregate({
    where: { subscriptionId: sub.id, type: { in: ['GRANT', 'TOPUP'] } },
    _sum: { deltaDeliveries: true },
  });
  const creditsGranted = grantedAgg._sum.deltaDeliveries ?? 0;

  return { subscription: sub, creditsLeft, creditsGranted, isActive: true };
}

export interface DeliveryFeeContext {
  feeInr: number;
  /** 'free' = covered by a credit; 'post-included' = ₹X after credits ran
   *  out; 'standard' = non-member price from SiteSetting. */
  source: 'free' | 'post-included' | 'standard';
  subscriptionId: string | null;
  /** Set when this order will debit a credit on placement. */
  debitCredit: boolean;
}

/** Resolves the actual delivery fee for a user given their membership state
 *  and the platform's standard fee. The caller (order placement, checkout
 *  preview) feeds the result into computeBreakdown. */
export function resolveDeliveryFee(state: MembershipState, standardFeeInr: number): DeliveryFeeContext {
  if (!state.isActive || !state.subscription) {
    return { feeInr: standardFeeInr, source: 'standard', subscriptionId: null, debitCredit: false };
  }
  if (state.creditsLeft > 0) {
    return { feeInr: 0, source: 'free', subscriptionId: state.subscription.id, debitCredit: true };
  }
  return {
    feeInr: state.subscription.postIncludedFeeInrSnapshot,
    source: 'post-included',
    subscriptionId: state.subscription.id,
    debitCredit: false,
  };
}

/** Create an ACTIVE subscription with a GRANT ledger row equal to the
 *  plan's included deliveries. Cycle end is now + cycleDays. */
export async function purchaseSubscription(userId: string, planId: string): Promise<Subscription> {
  const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active) throw new Error('Plan not available');

  const existing = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE' },
  });
  if (existing) throw new Error('You already have an active subscription. Wait for it to end or recharge instead.');

  const now = new Date();
  const cycleEnd = new Date(now);
  cycleEnd.setDate(cycleEnd.getDate() + plan.cycleDays);

  return prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.create({
      data: {
        userId,
        planId: plan.id,
        cycleStart: now,
        cycleEnd,
        planNameSnapshot: plan.name,
        priceInrSnapshot: plan.priceInr,
        cycleDaysSnapshot: plan.cycleDays,
        includedDeliveriesSnapshot: plan.includedDeliveries,
        postIncludedFeeInrSnapshot: plan.postIncludedFeeInr,
      },
    });
    await tx.subscriptionLedger.create({
      data: {
        subscriptionId: sub.id,
        type: 'GRANT',
        deltaDeliveries: plan.includedDeliveries,
        note: `Plan purchase — ${plan.name}`,
      },
    });
    return sub;
  });
}

/** Buys a top-up: adds credits to the active subscription without changing
 *  cycleEnd. Throws if there's no active subscription. */
export async function purchaseTopUp(userId: string, topUpId: string): Promise<{ subscriptionId: string; addedDeliveries: number }> {
  const topUp = await prisma.membershipTopUp.findUnique({ where: { id: topUpId } });
  if (!topUp || !topUp.active) throw new Error('Top-up not available');

  const sub = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE' },
  });
  if (!sub) throw new Error('Buy a subscription first — top-ups extend an active plan.');

  await prisma.subscriptionLedger.create({
    data: {
      subscriptionId: sub.id,
      type: 'TOPUP',
      deltaDeliveries: topUp.addedDeliveries,
      topUpId: topUp.id,
      note: `Top-up — ${topUp.name}`,
    },
  });
  return { subscriptionId: sub.id, addedDeliveries: topUp.addedDeliveries };
}

/** Called by order placement after the order row is created. Writes a DEBIT
 *  ledger entry tied to the order. */
export async function debitCreditForOrder(subscriptionId: string, orderId: string): Promise<void> {
  await prisma.subscriptionLedger.create({
    data: {
      subscriptionId,
      orderId,
      type: 'DEBIT',
      deltaDeliveries: -1,
      note: 'Order delivery',
    },
  });
}

export async function listActivePlans(): Promise<MembershipPlan[]> {
  return prisma.membershipPlan.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { priceInr: 'asc' }],
  });
}

export async function listActiveTopUps(): Promise<MembershipTopUp[]> {
  return prisma.membershipTopUp.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { priceInr: 'asc' }],
  });
}
