'use client';

import { useEffect, useState } from 'react';

interface Feedback {
  id: string;
  deliveryRating: number | null;
  deliveryComment: string | null;
  createdAt: string;
  order: {
    id: string;
    placedAt: string;
    deliveredAt: string | null;
    vendorName: string | null;
    building: string;
    society: string;
  };
}

interface Stats {
  count: number;
  avg: number;
  distribution: Array<{ star: number; count: number }>;
}

export function RiderFeedbackClient({ rider }: { rider: { name: string } }) {
  const [data, setData] = useState<{ feedback: Feedback[]; stats: Stats } | null>(null);

  useEffect(() => {
    fetch('/api/rider/feedback', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { if (j.ok) setData({ feedback: j.feedback, stats: j.stats }); });
  }, []);

  if (!data) return <div className="text-[13px] text-[color:var(--color-ink-soft)]">Loading…</div>;

  const max = Math.max(1, ...data.stats.distribution.map((d) => d.count));

  return (
    <div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Your delivery rating</div>
        <h1 className="mt-2 font-serif text-[32px] sm:text-[40px] leading-[1.02] tracking-[-0.02em]">
          Neighbours{' '}
          <span className="italic text-[color:var(--color-forest)]">rate you, {rider.name.split(' ')[0]}.</span>
        </h1>
      </div>

      <div className="mt-6 grid sm:grid-cols-[1fr_1.6fr] gap-5">
        <div className="rounded-2xl border border-[color:var(--color-forest)]/25 bg-gradient-to-br from-[color:var(--color-forest)]/8 to-[color:var(--color-moss)]/4 p-6">
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-ink-soft)]/70">Avg delivery rating</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-serif text-[54px] leading-none text-[color:var(--color-forest)]">{data.stats.avg.toFixed(1)}</span>
            <span className="text-[color:var(--color-saffron)] text-[18px]">★</span>
          </div>
          <div className="mt-1 text-[12.5px] text-[color:var(--color-ink-soft)]/80">
            Across {data.stats.count} rating{data.stats.count === 1 ? '' : 's'}
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-5 space-y-1.5">
          {[...data.stats.distribution].reverse().map((d) => (
            <div key={d.star} className="flex items-center gap-2 text-[12px]">
              <span className="w-12 text-[color:var(--color-ink-soft)]">{d.star} ★</span>
              <div className="flex-1 h-1.5 rounded-full bg-[color:var(--color-ink)]/8 overflow-hidden">
                <div className="h-full bg-[color:var(--color-forest)]" style={{ width: `${(d.count / max) * 100}%` }} />
              </div>
              <span className="w-8 text-right tabular-nums">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[color:var(--color-ink)]/8 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">
          Recent ratings
        </div>
        {data.feedback.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-[color:var(--color-ink-soft)]/75">
            No ratings yet. Every delivered drop can get rated by the customer.
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--color-ink)]/8">
            {data.feedback.map((f) => (
              <li key={f.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em]">
                      <Stars rating={f.deliveryRating ?? 0} />
                      <span className="text-[color:var(--color-ink-soft)]/60">· #{f.order.id.slice(-6)}</span>
                    </div>
                    <div className="mt-1 text-[12.5px] text-[color:var(--color-ink-soft)]/80 truncate">
                      {f.order.vendorName ?? 'Vendor'} → {f.order.building} · {f.order.society}
                    </div>
                    {f.deliveryComment && (
                      <p className="mt-2 text-[13px] leading-[1.55] text-[color:var(--color-ink)]">&ldquo;{f.deliveryComment}&rdquo;</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 text-[11px] text-[color:var(--color-ink-soft)]/60">
                    {new Date(f.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-[color:var(--color-saffron)]">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rating ? '' : 'text-[color:var(--color-ink)]/15'}>★</span>
      ))}
    </span>
  );
}
