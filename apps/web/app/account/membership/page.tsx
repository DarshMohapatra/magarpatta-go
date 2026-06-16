import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCustomerScope } from '@/lib/customer-scope';
import { getMembershipState, listActivePlans, listActiveTopUps } from '@/lib/membership';
import { CartDrawer } from '@/components/cart-drawer';
import { MobileShell } from '@/components/customer/mobile-shell';
import { TopBar } from '@/components/customer/top-bar';
import { getServerSession } from '@/lib/session';
import { MembershipClient } from './membership-client';

export const dynamic = 'force-dynamic';

export default async function MembershipPage() {
  const scope = await getCustomerScope();
  if (!scope) redirect('/signin');

  const [state, plans, topUps, session] = await Promise.all([
    getMembershipState(scope.userId),
    listActivePlans(),
    listActiveTopUps(),
    getServerSession(),
  ]);

  return (
    <>
    <MobileShell topBar={<TopBar session={session} />}>
      {/* Breadcrumb to /profile */}
      <div className="px-4 lg:px-8 pt-4 max-w-[960px] mx-auto">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-[12px] text-[color:var(--color-muted)] hover:text-[color:var(--color-primary)]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to profile
        </Link>
      </div>

      {/* Gradient-warm hero — matches /profile + /orders + /home */}
      <div className="px-4 lg:px-8 pt-3 max-w-[960px] mx-auto">
        <div className="relative overflow-hidden rounded-[var(--radius-2xl)] gradient-warm text-white p-5 shadow-[var(--shadow-glow)]">
          <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -bottom-8 -left-6 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="text-[10px] uppercase tracking-[0.18em] font-semibold opacity-90">Your membership</div>
            <h1 className="mt-2 font-display text-[26px] leading-tight tracking-tight">
              Deliveries on a subscription.
            </h1>
            <p className="mt-1 text-[12.5px] opacity-90 max-w-[520px]">
              Save on every delivery with a plan. Recharge or fall back to the lower per-delivery rate when credits run out.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[960px] px-4 sm:px-6 lg:px-8 pb-12">
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
    </MobileShell>
    <CartDrawer />
    </>
  );
}

