import { NextResponse } from 'next/server';
import { getCustomerScope } from '@/lib/customer-scope';
import { getDeliveryFeeInr } from '@/lib/settings';
import { getMembershipState, listActivePlans } from '@/lib/membership';

export const dynamic = 'force-dynamic';

/**
 * Live pricing context for the cart drawer / checkout previews. Returns the
 * current customer's effective delivery fee, their membership state, and the
 * single "best" plan we want to upsell when they're not yet a subscriber.
 *
 * Cheap — one settings read (cached per-request) + a couple of indexed user
 * queries when signed in. Safe for unsigned visitors (returns standard fee).
 */
export async function GET() {
  const scope = await getCustomerScope();
  const [standardFeeInr, plans] = await Promise.all([
    getDeliveryFeeInr(),
    listActivePlans(),
  ]);

  if (!scope) {
    return NextResponse.json({
      ok: true,
      signedIn: false,
      effectiveFeeInr: standardFeeInr,
      standardFeeInr,
      membership: null,
      planOffer: plans[0]
        ? {
            planId: plans[0].id,
            name: plans[0].name,
            priceInr: plans[0].priceInr,
            includedDeliveries: plans[0].includedDeliveries,
            cycleDays: plans[0].cycleDays,
            postIncludedFeeInr: plans[0].postIncludedFeeInr,
          }
        : null,
    });
  }

  const state = await getMembershipState(scope.userId);
  if (state.isActive && state.subscription) {
    const effective = state.creditsLeft > 0 ? 0 : state.subscription.postIncludedFeeInrSnapshot;
    return NextResponse.json({
      ok: true,
      signedIn: true,
      effectiveFeeInr: effective,
      standardFeeInr,
      membership: {
        planName: state.subscription.planNameSnapshot,
        creditsLeft: state.creditsLeft,
        creditsGranted: state.creditsGranted,
        postIncludedFeeInr: state.subscription.postIncludedFeeInrSnapshot,
      },
      planOffer: null,
    });
  }

  return NextResponse.json({
    ok: true,
    signedIn: true,
    effectiveFeeInr: standardFeeInr,
    standardFeeInr,
    membership: null,
    planOffer: plans[0]
      ? {
          planId: plans[0].id,
          name: plans[0].name,
          priceInr: plans[0].priceInr,
          includedDeliveries: plans[0].includedDeliveries,
          cycleDays: plans[0].cycleDays,
          postIncludedFeeInr: plans[0].postIncludedFeeInr,
        }
      : null,
  });
}
