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
 * Convert a SlotDefinition + a target IST date into the absolute UTC start
 * and end timestamps we snapshot onto Order. startMin/endMin are wall-clock
 * minutes in *India Standard Time*, not in whatever timezone the server
 * happens to run in — Vercel functions run in UTC, so using `new Date(y, m,
 * d, h, mm)` (which uses host-local time) would put 5 PM IST at 22:30 IST
 * on prod. Building the date via an ISO string with the +05:30 offset
 * pins both endpoints regardless of host TZ.
 */
export function materialiseSlot(def: SlotDefinition, dateIso: string): { start: Date; end: Date } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const startHH = Math.floor(def.startMin / 60);
  const startMM = def.startMin % 60;
  const endHH = Math.floor(def.endMin / 60);
  const endMM = def.endMin % 60;
  const start = new Date(`${dateIso}T${pad(startHH)}:${pad(startMM)}:00+05:30`);
  const end = new Date(`${dateIso}T${pad(endHH)}:${pad(endMM)}:00+05:30`);
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
    const { start, end } = materialiseSlot(d, dateIso);
    const cutoff = d.cutoffMinutesBefore ?? 0;
    const acceptOrdersUntil = start.getTime() - cutoff * 60 * 1000;
    // A slot is expired if either: (a) the cutoff-before-start has passed,
    // or (b) the slot end time itself is already in the past. (b) covers
    // the case where cutoffMinutesBefore is 0 / missing — e.g. legacy rows
    // seeded before that field existed.
    const expired = acceptOrdersUntil <= now || end.getTime() <= now;
    return {
      ...d,
      dateIso,
      booked,
      full: booked >= d.capacity,
      expired,
    };
  });
}

/**
 * IST calendar date for the given instant. We never want server-local TZ
 * here — Vercel runs in UTC, and past 18:30 UTC the IST date is already
 * the next day. en-CA gives YYYY-MM-DD format.
 */
function istDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function isoToday(): string {
  return istDate(new Date());
}

export function isoTomorrow(): string {
  return istDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
}
