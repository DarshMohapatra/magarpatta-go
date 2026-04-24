import type { OrderStatus } from '@prisma/client';

/**
 * Demo auto-progression: computes what the order status *should* be based on
 * elapsed time since placedAt. This is the fallback when no real vendor/rider
 * is driving the order (legacy orders / orders from vendors without owner
 * accounts yet).
 *
 * When a real vendor has clicked "accept" on their dashboard OR a rider has
 * claimed the order, the DB timestamps take over and this function is bypassed.
 */
export const STATUS_TIMELINE: Array<{ status: OrderStatus; atSeconds: number; label: string }> = [
  { status: 'PLACED',           atSeconds: 0,   label: 'Order placed' },
  { status: 'ACCEPTED',         atSeconds: 20,  label: 'Vendor accepted' },
  { status: 'PREPARING',        atSeconds: 50,  label: 'Preparing your order' },
  { status: 'PICKED_UP',        atSeconds: 150, label: 'Rider picked up' },
  { status: 'OUT_FOR_DELIVERY', atSeconds: 210, label: 'Out for delivery' },
  { status: 'DELIVERED',        atSeconds: 480, label: 'Delivered' },
];

export function expectedStatusForElapsed(elapsedSeconds: number): OrderStatus {
  let out: OrderStatus = 'PLACED';
  for (const step of STATUS_TIMELINE) {
    if (elapsedSeconds >= step.atSeconds) out = step.status;
  }
  return out;
}

export function statusLabel(status: OrderStatus): string {
  return STATUS_TIMELINE.find((s) => s.status === status)?.label ?? status;
}

export function statusProgress(status: OrderStatus): number {
  const idx = STATUS_TIMELINE.findIndex((s) => s.status === status);
  if (idx < 0) return 0;
  return idx / (STATUS_TIMELINE.length - 1);
}

export function riderIsMoving(status: OrderStatus): boolean {
  return status === 'PICKED_UP' || status === 'OUT_FOR_DELIVERY';
}

/**
 * Deterministic 4-digit delivery OTP derived from the order id.
 */
export function deliveryOtp(orderId: string): string {
  let h = 0;
  for (let i = 0; i < orderId.length; i++) {
    h = ((h << 5) - h + orderId.charCodeAt(i)) | 0;
  }
  return String(Math.abs(h) % 10000).padStart(4, '0');
}

/**
 * Real-timestamp-driven status: walks vendorAcceptedAt → vendorReadyAt →
 * pickedUpAt → deliveredAt and returns the furthest step that has a timestamp.
 * Callers pass the Order row; any null timestamp is treated as "not yet."
 */
export interface OrderTimestamps {
  placedAt: Date;
  vendorAcceptedAt?: Date | null;
  vendorReadyAt?: Date | null;
  pickedUpAt?: Date | null;
  deliveredAt?: Date | null;
  cancelledAt?: Date | null;
  status: OrderStatus;
}

export function statusFromTimestamps(o: OrderTimestamps): OrderStatus {
  if (o.status === 'CANCELLED' || o.cancelledAt) return 'CANCELLED';
  if (o.deliveredAt) return 'DELIVERED';
  if (o.pickedUpAt) return 'OUT_FOR_DELIVERY';
  if (o.vendorReadyAt) return 'PREPARING';
  if (o.vendorAcceptedAt) return 'ACCEPTED';
  return 'PLACED';
}

export interface TimelineStep {
  status: OrderStatus;
  label: string;
  at: Date | null;
  reached: boolean;
}

/**
 * Timeline rows for the customer tracker — each step carries the real IST
 * timestamp when it's been reached, or null for future steps.
 */
export function timelineRows(o: OrderTimestamps): TimelineStep[] {
  const status = statusFromTimestamps(o);
  const progressIdx = STATUS_TIMELINE.findIndex((s) => s.status === status);
  return STATUS_TIMELINE.map((step, idx) => {
    const reached = idx <= progressIdx;
    let at: Date | null = null;
    if (reached) {
      switch (step.status) {
        case 'PLACED':           at = o.placedAt; break;
        case 'ACCEPTED':         at = o.vendorAcceptedAt ?? null; break;
        case 'PREPARING':        at = o.vendorReadyAt ?? null; break;
        case 'PICKED_UP':        at = o.pickedUpAt ?? null; break;
        case 'OUT_FOR_DELIVERY': at = o.pickedUpAt ?? null; break;
        case 'DELIVERED':        at = o.deliveredAt ?? null; break;
        default:                 at = null;
      }
    }
    return { status: step.status, label: step.label, at, reached };
  });
}

/**
 * True if the order is being driven by real vendor/rider actions (i.e. any
 * vendor or rider timestamp exists). When false, use demo auto-progression.
 */
export function isRealtimeDriven(o: Pick<OrderTimestamps, 'vendorAcceptedAt' | 'pickedUpAt' | 'deliveredAt'>): boolean {
  return Boolean(o.vendorAcceptedAt || o.pickedUpAt || o.deliveredAt);
}
