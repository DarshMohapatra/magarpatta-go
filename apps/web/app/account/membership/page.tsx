import { redirect } from 'next/navigation';
import { getCustomerScope } from '@/lib/customer-scope';
import { getMembershipState, listActivePlans, listActiveTopUps } from '@/lib/membership';
import { NavbarWithSession } from '@/components/navbar-with-session';
import { Footer } from '@/components/footer';
import { CartDrawer } from '@/components/cart-drawer';
import { MembershipClient } from './membership-client';

export const dynamic = 'force-dynamic';

export default async function MembershipPage() {
  const scope = await getCustomerScope();
  if (!scope) redirect('/signin');

  const [state, plans, topUps] = await Promise.all([
    getMembershipState(scope.userId),
    listActivePlans(),
    listActiveTopUps(),
  ]);

  return (
    <main className="relative z-10 min-h-screen">
      <NavbarWithSession />
      <div className="mx-auto max-w-[960px] px-4 sm:px-6 py-12">
        <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Your membership</div>
        <h1 className="mt-2 font-serif text-[40px] sm:text-[52px] leading-[1.02] tracking-[-0.02em]">
          Deliveries on a <span className="italic text-[color:var(--color-forest)]">subscription.</span>
        </h1>
        <p className="mt-3 text-[14px] text-[color:var(--color-ink-soft)] max-w-[520px]">
          Save on every delivery with a plan. Run out of credits before the
          cycle ends? Pay the lower per-delivery rate or recharge to keep saving.
        </p>

        <MembershipClient
          initialState={{
            isActive: state.isActive,
            creditsLeft: state.creditsLeft,
            creditsGranted: state.creditsGranted,
            subscription: state.subscription
              ? {
                  id: state.subscription.id,
                  planName: state.subscription.planNameSnapshot,
                  cycleStart: state.subscription.cycleStart.toISOString(),
                  cycleEnd: state.subscription.cycleEnd.toISOString(),
                  includedDeliveries: state.subscription.includedDeliveriesSnapshot,
                  postIncludedFeeInr: state.subscription.postIncludedFeeInrSnapshot,
                }
              : null,
          }}
          plans={plans.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            priceInr: p.priceInr,
            cycleDays: p.cycleDays,
            includedDeliveries: p.includedDeliveries,
            postIncludedFeeInr: p.postIncludedFeeInr,
          }))}
          topUps={topUps.map((t) => ({
            id: t.id,
            name: t.name,
            priceInr: t.priceInr,
            addedDeliveries: t.addedDeliveries,
          }))}
        />
      </div>
      <Footer />
      <CartDrawer />
    </main>
  );
}
