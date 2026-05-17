import 'server-only';
import { prisma } from './prisma';
import { getSlotDefinitions, type SlotDefinition } from './settings';

/**
 * Slot picker support. Customers either pick "Order now" or one of the admin-
 * defined windows on a chosen date. Capacity is a soft cap — overbooking is
 * permitted by design (the picker shows "filling fast" past the cap but the
 * order still goes through).
 */

export interface SlotAvailability extends SlotDefinition {
  /** ISO date the row was computed for. */
  dateIso: string;
  /** Order count already booked into this slot for that date. */
  booked: number;
  /** booked >= capacity. UI-only signal. */
  full: boolean;
  /** True if the slot's start − cutoffMinutesBefore is already in the past
   *  for this date. The picker hides expired slots; the order POST rejects
   *  them. */
  expired: boolean;
}

export function startOfDayUtc(d: Date): Date {
  const u = new Date(d);
  u.setUTCHours(0, 0, 0, 0);
  return u;
}

export function endOfDayUtc(d: Date): Date {
  const u = new Date(d);
  u.setUTCHours(23, 59, 59, 999);
  return u;
}

export function parseDateIso(value: string | null | undefined): Date {
  if (!value) return startOfDayUtc(new Date());
  const d = new Date(value);
  if (isNaN(d.getTime())) return startOfDayUtc(new Date());
  return startOfDayUtc(d);
}

/**
 * Convert a SlotDefinition + a target local date into the absolute start/end
 * timestamps that we snapshot onto Order. We treat startMin/endMin as local
 * wall-clock minutes; the JS Date constructor handles the offset.
 */
export function materialiseSlot(def: SlotDefinition, dateIso: string): { start: Date; end: Date } {
  const [y, m, d] = dateIso.split('-').map((n) => Number(n));
  const start = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  start.setMinutes(def.startMin);
  const end = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  end.setMinutes(def.endMin);
  return { start, end };
}

export async function getSlotAvailability(dateIso: string): Promise<SlotAvailability[]> {
  const defs = await getSlotDefinitions();
  if (defs.length === 0) return [];

  const dayStart = startOfDayUtc(new Date(dateIso));
  const dayEnd = endOfDayUtc(new Date(dateIso));

  const bookings = await prisma.order.groupBy({
    by: ['deliverySlotId'],
    where: {
      deliveryWindow: 'SLOTTED',
      deliverySlotStart: { gte: dayStart, lte: dayEnd },
      status: { notIn: ['CANCELLED'] },
    },
    _count: { _all: true },
  });

  const counts = new Map<string, number>();
  for (const b of bookings) {
    if (b.deliverySlotId) counts.set(b.deliverySlotId, b._count._all);
  }

  const now = Date.now();
  return defs.map((d) => {
    const booked = counts.get(d.id) ?? 0;
    const { start } = materialiseSlot(d, dateIso);
    const cutoff = d.cutoffMinutesBefore ?? 0;
    const acceptOrdersUntil = start.getTime() - cutoff * 60 * 1000;
    return {
      ...d,
      dateIso,
      booked,
      full: booked >= d.capacity,
      expired: acceptOrdersUntil <= now,
    };
  });
}

export function isoToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function isoTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
