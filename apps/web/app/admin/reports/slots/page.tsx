import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';
import { AdminShell } from '@/components/admin/admin-shell';

export const dynamic = 'force-dynamic';

interface RowItem {
  name: string;
  unit: string | null;
  quantity: number;
}

interface SlotBucket {
  slotLabel: string;
  slotId: string | null;
  slotStart: Date | null;
  orders: number;
  revenueInr: number;
  items: Map<string, RowItem>;
}

interface DayBucket {
  dateIso: string;
  slots: Map<string, SlotBucket>;
}

function isoLocal(d: Date): string {
  // We bucket by the day the slot was scheduled in IST. Pune is UTC+5:30 —
  // for a trial in one timezone, .toLocaleDateString with the IN locale is
  // good enough and avoids pulling in a tz library.
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function parseDateInput(value: string | undefined, fallback: Date): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export default async function SlotReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/signin');

  const params = await searchParams;
  const today = new Date();
  const todayIso = isoLocal(today);
  // Default range: today → 6 days out (the picker only allows 7 days).
  const sevenOut = new Date(today);
  sevenOut.setDate(sevenOut.getDate() + 6);
  const fromDate = parseDateInput(params.from, today);
  const toDate = parseDateInput(params.to, sevenOut);

  const rangeStart = new Date(fromDate); rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(toDate); rangeEnd.setHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: {
      deliveryWindow: 'SLOTTED',
      deliverySlotStart: { gte: rangeStart, lte: rangeEnd },
      status: { notIn: ['CANCELLED'] },
    },
    select: {
      id: true,
      status: true,
      deliverySlotId: true,
      deliverySlotLabel: true,
      deliverySlotStart: true,
      totalInr: true,
      vendorName: true,
      items: { select: { name: true, quantity: true, unit: true } },
    },
    orderBy: { deliverySlotStart: 'asc' },
  });

  // Build day → slot rollup
  const days = new Map<string, DayBucket>();
  for (const o of orders) {
    if (!o.deliverySlotStart) continue;
    const dayIso = isoLocal(o.deliverySlotStart);
    if (!days.has(dayIso)) days.set(dayIso, { dateIso: dayIso, slots: new Map() });
    const day = days.get(dayIso)!;
    const slotKey = o.deliverySlotId ?? 'unknown';
    if (!day.slots.has(slotKey)) {
      day.slots.set(slotKey, {
        slotId: o.deliverySlotId,
        slotLabel: o.deliverySlotLabel ?? 'Unknown slot',
        slotStart: o.deliverySlotStart,
        orders: 0,
        revenueInr: 0,
        items: new Map(),
      });
    }
    const bucket = day.slots.get(slotKey)!;
    bucket.orders += 1;
    bucket.revenueInr += o.totalInr;
    for (const item of o.items) {
      const key = `${item.name}|${item.unit ?? ''}`;
      const existing = bucket.items.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        bucket.items.set(key, { name: item.name, unit: item.unit, quantity: item.quantity });
      }
    }
  }

  const sortedDays = Array.from(days.values()).sort((a, b) => a.dateIso.localeCompare(b.dateIso));

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + o.totalInr, 0);

  return (
    <AdminShell name={admin.name} role={admin.role}>
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Reports</div>
        <h1 className="mt-2 font-serif text-[36px] sm:text-[44px] leading-[1.02] tracking-[-0.02em]">
          Slot <span className="italic text-[color:var(--color-forest)]">pick list.</span>
        </h1>
        <p className="mt-3 text-[14px] text-[color:var(--color-ink-soft)] max-w-[640px]">
          Orders grouped by delivery day + slot with an aggregated item rollup —
          use it as the morning pick list for vendors and the rider plan.
          Cancelled orders are excluded.
        </p>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-4" method="get">
        <label className="flex flex-col text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]">
          From
          <input
            type="date"
            name="from"
            defaultValue={params.from ?? todayIso}
            className="mt-1 rounded-md border border-[color:var(--color-ink)]/15 px-3 py-1.5 text-[14px] text-[color:var(--color-ink)] outline-none focus:border-[color:var(--color-forest)]"
          />
        </label>
        <label className="flex flex-col text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]">
          To
          <input
            type="date"
            name="to"
            defaultValue={params.to ?? isoLocal(sevenOut)}
            className="mt-1 rounded-md border border-[color:var(--color-ink)]/15 px-3 py-1.5 text-[14px] text-[color:var(--color-ink)] outline-none focus:border-[color:var(--color-forest)]"
          />
        </label>
        <button type="submit" className="rounded-md bg-[color:var(--color-forest)] text-white px-4 py-2 text-[13px] font-medium hover:opacity-90">
          Refresh
        </button>
        <div className="ml-auto text-[12.5px] text-[color:var(--color-ink-soft)]">
          {totalOrders} order{totalOrders === 1 ? '' : 's'} · ₹{totalRevenue.toLocaleString('en-IN')} in range
        </div>
      </form>

      {sortedDays.length === 0 ? (
        <p className="mt-12 text-[14px] text-[color:var(--color-ink-soft)] italic">
          No slotted orders in this range.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          {sortedDays.map((day) => {
            const dayLabel = new Date(day.dateIso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });
            const dayOrders = Array.from(day.slots.values()).reduce((s, b) => s + b.orders, 0);
            const dayRevenue = Array.from(day.slots.values()).reduce((s, b) => s + b.revenueInr, 0);
            return (
              <section key={day.dateIso} className="rounded-3xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6">
                <div className="flex items-end justify-between gap-4">
                  <h2 className="font-serif text-[24px]">{dayLabel}</h2>
                  <div className="text-[12px] text-[color:var(--color-ink-soft)]">{dayOrders} orders · ₹{dayRevenue.toLocaleString('en-IN')}</div>
                </div>

                <div className="mt-5 space-y-5">
                  {Array.from(day.slots.values())
                    .sort((a, b) => (a.slotStart?.getTime() ?? 0) - (b.slotStart?.getTime() ?? 0))
                    .map((slot) => (
                      <div key={slot.slotId ?? slot.slotLabel} className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-cream)]/40 p-4">
                        <div className="flex items-baseline justify-between gap-3 flex-wrap">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">{slot.slotLabel}</div>
                            <div className="mt-0.5 text-[13px] text-[color:var(--color-ink-soft)]">
                              {slot.orders} order{slot.orders === 1 ? '' : 's'} · ₹{slot.revenueInr.toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/70 mb-2">Pick list</div>
                          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[13.5px]">
                            {Array.from(slot.items.values())
                              .sort((a, b) => b.quantity - a.quantity)
                              .map((item) => (
                                <li key={`${item.name}|${item.unit}`} className="flex items-baseline justify-between gap-3 border-b border-[color:var(--color-ink)]/6 py-1">
                                  <span>{item.name}</span>
                                  <span className="text-[color:var(--color-ink-soft)] font-medium">
                                    × {item.quantity}{item.unit ? ` (${item.unit})` : ''}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
