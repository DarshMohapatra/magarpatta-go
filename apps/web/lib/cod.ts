import 'server-only';
import type { CustomerPrisma } from './customer-db';

// A customer earns COD by completing this many successful prepaid orders. The
// rule exists because a fraudulent COD address costs us a wasted rider trip
// and the food itself; making someone prepay first proves the address is real
// and the customer is reachable.
export const COD_PREPAID_THRESHOLD = 3;

// Hard ceiling on what a single COD order can total. Higher-value orders need
// online payment regardless of trust level — limits the blast radius of a
// rejected delivery.
export const COD_MAX_ORDER_INR = 500;

export interface CodEligibility {
  eligible: boolean;
  prepaidCount: number;
  adminApproved: boolean;
  threshold: number;
  maxOrderInr: number;
}

/**
 * Compute COD eligibility for the customer the scoped client is bound to.
 * Both queries below are auto-filtered by userId via the customer-fence
 * extension — there is no way to ask about another user's eligibility from
 * this helper.
 */
export async function getCodEligibility(db: CustomerPrisma): Promise<CodEligibility> {
  const [user, prepaidCount] = await Promise.all([
    // The empty where is fine — the wrapper injects `id = <session userId>`.
    // findFirst is used (not findUnique) because findUnique requires the
    // where to be satisfied at the type level and we'd need to pass a
    // placeholder id. findFirst lets us pass `{}`.
    db.user.findFirst({ where: {}, select: { codApprovedByAdmin: true } }),
    db.order.count({
      where: { status: 'DELIVERED', paymentMethod: { not: 'COD' } },
    }),
  ]);

  const adminApproved = user?.codApprovedByAdmin ?? false;
  const eligible = adminApproved || prepaidCount >= COD_PREPAID_THRESHOLD;

  return {
    eligible,
    prepaidCount,
    adminApproved,
    threshold: COD_PREPAID_THRESHOLD,
    maxOrderInr: COD_MAX_ORDER_INR,
  };
}
