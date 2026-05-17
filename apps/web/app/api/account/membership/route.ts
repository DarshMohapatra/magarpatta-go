import { NextResponse } from 'next/server';
import { getCustomerScope } from '@/lib/customer-scope';
import { getMembershipState, listActivePlans, listActiveTopUps, purchaseSubscription, purchaseTopUp } from '@/lib/membership';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

export async function GET() {
  const scope = await getCustomerScope();
  if (!scope) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const [state, plans, topUps] = await Promise.all([
    getMembershipState(scope.userId),
    listActivePlans(),
    listActiveTopUps(),
  ]);

  const history = state.subscription
    ? await prisma.subscriptionLedger.findMany({
        where: { subscriptionId: state.subscription.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    : [];

  return NextResponse.json({
    ok: true,
    state: {
      isActive: state.isActive,
      creditsLeft: state.creditsLeft,
      creditsGranted: state.creditsGranted,
      subscription: state.subscription
        ? {
            id: state.subscription.id,
            planName: state.subscription.planNameSnapshot,
            cycleStart: state.subscription.cycleStart,
            cycleEnd: state.subscription.cycleEnd,
            includedDeliveries: state.subscription.includedDeliveriesSnapshot,
            postIncludedFeeInr: state.subscription.postIncludedFeeInrSnapshot,
          }
        : null,
    },
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      priceInr: p.priceInr,
      cycleDays: p.cycleDays,
      includedDeliveries: p.includedDeliveries,
      postIncludedFeeInr: p.postIncludedFeeInr,
    })),
    topUps: topUps.map((t) => ({
      id: t.id,
      name: t.name,
      priceInr: t.priceInr,
      addedDeliveries: t.addedDeliveries,
    })),
    history,
  });
}

interface PostBody {
  action: 'subscribe' | 'topup';
  planId?: string;
  topUpId?: string;
}

export async function POST(req: Request) {
  const scope = await getCustomerScope();
  if (!scope) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  let body: PostBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    if (body.action === 'subscribe') {
      if (!body.planId) return NextResponse.json({ ok: false, error: 'planId required' }, { status: 400 });
      const sub = await purchaseSubscription(scope.userId, body.planId);
      await logActivity({
        actorRole: 'CUSTOMER',
        actorId: scope.userId,
        actorName: scope.session.name ?? scope.session.phone,
        action: 'SUBSCRIPTION_PURCHASE',
        summary: `${scope.session.name ?? scope.session.phone} bought ${sub.planNameSnapshot}`,
        metadata: { subscriptionId: sub.id, planId: sub.planId },
      });
      return NextResponse.json({ ok: true, subscriptionId: sub.id });
    }

    if (body.action === 'topup') {
      if (!body.topUpId) return NextResponse.json({ ok: false, error: 'topUpId required' }, { status: 400 });
      const r = await purchaseTopUp(scope.userId, body.topUpId);
      await logActivity({
        actorRole: 'CUSTOMER',
        actorId: scope.userId,
        actorName: scope.session.name ?? scope.session.phone,
        action: 'TOPUP_PURCHASE',
        summary: `${scope.session.name ?? scope.session.phone} added ${r.addedDeliveries} deliveries`,
        metadata: { subscriptionId: r.subscriptionId, topUpId: body.topUpId },
      });
      return NextResponse.json({ ok: true, addedDeliveries: r.addedDeliveries });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
