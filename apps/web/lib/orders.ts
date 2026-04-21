import type { OrderStatus } from '@prisma/client';

/**
 * Demo auto-progression: computes what the order status *should* be based on
 * elapsed time since placedAt. This lets us show a realistic end-to-end
 * delivery flow (like Zomato / Swiggy's live tracker) without having a real
 * vendor/rider workflow yet.
 *
 * Real vendor acceptance + rider dispatch replaces this in Phase 2.
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

/** Used by the tracker to tell whether the rider should be visible + animating. */
export function riderIsMoving(status: OrderStatus): boolean {
  return status === 'PICKED_UP' || status === 'OUT_FOR_DELIVERY';
}
