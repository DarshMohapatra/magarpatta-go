import { redirect } from 'next/navigation';
import { getCustomerScope } from '@/lib/customer-scope';
import { getCodEligibility } from '@/lib/cod';
import { getDeliveryFeeInr, getSlotDefinitions } from '@/lib/settings';
import { getMembershipState, resolveDeliveryFee, listActiveTopUps, listActivePlans } from '@/lib/membership';
import { isoToday, isoTomorrow } from '@/lib/slots';
import { NavbarWithSession } from '@/components/navbar-with-session';
import { Footer } from '@/components/footer';
import { CartDrawer } from '@/components/cart-drawer';
import { CheckoutClient } from './checkout-client';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const scope = await getCustomerScope();
  if (!scope) redirect('/signin');

  const [cod, standardFeeInr, slotDefs, membership, topUps, plans] = await Promise.all([
    getCodEligibility(scope.db),
    getDeliveryFeeInr(),
    getSlotDefinitions(),
    getMembershipState(scope.userId),
    listActiveTopUps(),
    listActivePlans(),
  ]);

  const feeCtx = resolveDeliveryFee(membership, standardFeeInr);
  const offer = !membership.isActive && plans[0] ? plans[0] : null;

  return (
    <main className="relative z-10 min-h-screen">
      <NavbarWithSession />
      <CheckoutClient
        session={{
          phone: scope.session.phone,
          name: scope.session.name,
          addresses: scope.session.addresses,
        }}
        cod={{ eligible: cod.eligible, maxOrderInr: cod.maxOrderInr }}
        deliveryFeeInr={feeCtx.feeInr}
        feeSource={feeCtx.source}
        standardFeeInr={standardFeeInr}
        membership={
          membership.subscription
            ? {
                planName: membership.subscription.planNameSnapshot,
                creditsLeft: membership.creditsLeft,
                creditsGranted: membership.creditsGranted,
                postIncludedFeeInr: membership.subscription.postIncludedFeeInrSnapshot,
              }
            : null
        }
        topUpsAvailable={topUps.length > 0}
        planOffer={
          offer
            ? {
                planId: offer.id,
                name: offer.name,
                priceInr: offer.priceInr,
                includedDeliveries: offer.includedDeliveries,
                cycleDays: offer.cycleDays,
                postIncludedFeeInr: offer.postIncludedFeeInr,
              }
            : null
        }
        slotOptions={{
          today: isoToday(),
          tomorrow: isoTomorrow(),
          definitions: slotDefs,
        }}
      />
      <Footer />
      <CartDrawer />
    </main>
  );
}
