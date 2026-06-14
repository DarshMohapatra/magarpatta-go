import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';
import { logActivity } from '@/lib/activity-log';
import { notifyCustomerWeightReconciled } from '@/lib/notify-customer';

interface ItemReconcile {
  orderItemId: string;
  actualGrams: number;
  note?: string;
}

interface Body {
  items: ItemReconcile[];
}

/**
 * Vendor confirms the actual weighed amount for soldByWeight items in an
 * order. We recompute each line at the per-gram rate locked in at order
 * time (priceInr / estimatedGrams), rebuild the order's subtotal/total,
 * and fire a customer notification with the new total.
 *
 * Only callable on PLACED or ACCEPTED orders — once the order moves to
 * PREPARING we consider the weights locked. The vendor's ready button
 * refuses to advance while any soldByWeight item is unreconciled.
 *
 * Notification + ActivityLog are best-effort: failure to fan out a message
 * never rolls back the reconciliation. The customer can always read the
 * actual values on the order detail page.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (s.approvalStatus !== 'APPROVED') {
    return NextResponse.json({ ok: false, error: 'Shop is not yet approved.' }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Partial<Body>;
  const updates = Array.isArray(body.items) ? body.items : [];
  if (updates.length === 0) {
    return NextResponse.json({ ok: false, error: 'No items to reconcile.' }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, user: { select: { phone: true, locale: true } } },
  });
  if (!order) return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  if (order.vendorId !== s.vendorId) {
    return NextResponse.json({ ok: false, error: 'Not your order.' }, { status: 403 });
  }
  if (order.status !== 'PLACED' && order.status !== 'ACCEPTED') {
    return NextResponse.json({ ok: false, error: 'Weights can only be confirmed before the order is in preparation.' }, { status: 409 });
  }

  // Build per-item changes. Reject if any incoming row doesn't match an
  // existing OrderItem that's actually flagged soldByWeight.
  const byId = new Map(order.items.map((it) => [it.id, it]));
  const summary: Array<{ name: string; oldInr: number; newInr: number; oldGrams: number | null; newGrams: number; deltaPct: number; note?: string }> = [];

  for (const u of updates) {
    const it = byId.get(u.orderItemId);
    if (!it) return NextResponse.json({ ok: false, error: 'Unknown item.' }, { status: 400 });
    if (!it.soldByWeight) continue; // ignore non-weight items quietly
    if (!u.actualGrams || u.actualGrams <= 0) {
      return NextResponse.json({ ok: false, error: `Invalid weight for "${it.name}".` }, { status: 400 });
    }
    if (!it.estimatedGrams || it.estimatedGrams <= 0) continue;

    const pricePerGram = it.priceInr / it.estimatedGrams;
    const newPriceInr = Math.max(1, Math.round(pricePerGram * u.actualGrams));
    const oldPriceInr = it.priceInr;
    const deltaPct = oldPriceInr === 0 ? 0 : Math.abs(newPriceInr - oldPriceInr) / oldPriceInr * 100;

    // Guardrail: a >15% swing needs a vendor note so the customer
    // notification can carry an explanation.
    if (deltaPct > 15 && !(u.note && u.note.trim())) {
      return NextResponse.json({
        ok: false,
        error: `"${it.name}" weight changed by ${deltaPct.toFixed(0)}% — please add a short note.`,
      }, { status: 400 });
    }

    summary.push({
      name: it.name,
      oldInr: oldPriceInr * it.quantity,
      newInr: newPriceInr * it.quantity,
      oldGrams: it.estimatedGrams,
      newGrams: u.actualGrams,
      deltaPct,
      note: u.note?.trim() || undefined,
    });

    // Apply in-memory so the subtotal recompute below sees the new prices.
    byId.set(it.id, {
      ...it,
      actualGrams: u.actualGrams,
      actualPriceInr: newPriceInr,
      reconcileNote: u.note?.trim() || null,
      reconciledAt: new Date(),
    });
  }

  // Subtotal = sum of (actual or estimated) priceInr × quantity. All other
  // line items in the order keep their estimated prices.
  const newSubtotal = [...byId.values()].reduce((s, it) => {
    const effectivePrice = it.actualPriceInr ?? it.priceInr;
    return s + effectivePrice * it.quantity;
  }, 0);
  const newTotal =
    newSubtotal +
    order.convenienceInr +
    order.taxInr +
    order.addOnsInr +
    order.deliveryFeeInr -
    order.discountInr;
  const oldTotal = order.totalInr;

  // Transactional update: rewrite each affected OrderItem, then the Order
  // totals. Untouched items stay as-is.
  await prisma.$transaction([
    ...updates.flatMap((u) => {
      const it = byId.get(u.orderItemId);
      if (!it || !it.soldByWeight || !it.actualGrams) return [];
      return [
        prisma.orderItem.update({
          where: { id: it.id },
          data: {
            actualGrams: it.actualGrams,
            actualPriceInr: it.actualPriceInr,
            reconcileNote: it.reconcileNote,
            reconciledAt: it.reconciledAt,
          },
        }),
      ];
    }),
    prisma.order.update({
      where: { id: order.id },
      data: { subtotalInr: newSubtotal, totalInr: newTotal },
    }),
  ]);

  await logActivity({
    actorRole: 'VENDOR',
    actorId: s.vendorId,
    actorName: s.shopName,
    action: 'ORDER_RECONCILE_WEIGHT',
    summary: `${s.shopName} confirmed weights on order #${order.id.slice(-6)}: ₹${oldTotal} → ₹${newTotal}`,
    metadata: { orderId: order.id, oldTotal, newTotal, lines: summary },
  });

  // Fan out the in-app + WhatsApp notification. Best-effort.
  notifyCustomerWeightReconciled({
    userId: order.userId,
    userPhone: order.user.phone,
    orderId: order.id,
    oldTotal,
    newTotal,
    lines: summary,
  }).catch((e) => console.error('[reconcile-weight] notify failed', (e as Error).message));

  return NextResponse.json({ ok: true, oldTotal, newTotal, lines: summary });
}
