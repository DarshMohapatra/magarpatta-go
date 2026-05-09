'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TICKET_CATEGORY_LABEL } from '@/lib/support-tickets';
import type { TicketCategory } from '@prisma/client';

interface OrderOption {
  id: string;
  vendorName: string | null;
  totalInr: number;
  placedAt: string;
  status: string;
}

const CATEGORY_OPTIONS: TicketCategory[] = [
  'WRONG_ITEM', 'MISSING_ITEM', 'QUALITY', 'LATE_DELIVERY',
  'RIDER_BEHAVIOUR', 'PAYMENT', 'REFUND', 'ACCOUNT', 'OTHER',
];

export function NewTicketForm({ orders, preselectedOrderId }: { orders: OrderOption[]; preselectedOrderId: string | null }) {
  const router = useRouter();
  const [category, setCategory] = useState<TicketCategory | ''>('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [orderId, setOrderId] = useState<string>(preselectedOrderId ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const valid = category && subject.trim().length >= 4 && description.trim().length >= 10;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ category, subject, description, orderId: orderId || null }),
      });
      const body = await res.json();
      if (!body.ok) {
        setErr(body.error ?? 'Something went wrong');
        setSubmitting(false);
        return;
      }
      router.push(`/support/${body.ticket.id}`);
    } catch {
      setErr('Network error. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-6">
      <div>
        <label className="block text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)] mb-2">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as TicketCategory | '')}
          required
          className="w-full bg-[color:var(--color-cream)] border border-[color:var(--color-ink)]/14 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[color:var(--color-forest)]"
        >
          <option value="">— pick one —</option>
          {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{TICKET_CATEGORY_LABEL[c]}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)] mb-2">Headline</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={120}
          placeholder="One short line, e.g. 'Paneer was cold and packaging leaked'"
          required
          className="w-full bg-[color:var(--color-cream)] border border-[color:var(--color-ink)]/14 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[color:var(--color-forest)]"
        />
        <div className="mt-1 text-[11px] text-[color:var(--color-ink-soft)] text-right">{subject.length} / 120</div>
      </div>

      {orders.length > 0 ? (
        <div>
          <label className="block text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)] mb-2">Related order <span className="opacity-50 normal-case tracking-normal">(optional)</span></label>
          <select
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="w-full bg-[color:var(--color-cream)] border border-[color:var(--color-ink)]/14 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[color:var(--color-forest)]"
          >
            <option value="">— not about a specific order —</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                #{o.id.slice(-6).toUpperCase()} · {o.vendorName ?? 'Multiple shops'} · ₹{o.totalInr} · {new Date(o.placedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label className="block text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)] mb-2">What happened?</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          maxLength={4000}
          placeholder="Walk us through it. What did you order, what arrived, when, who delivered if you remember. The more we know, the faster we fix it."
          required
          className="w-full bg-[color:var(--color-cream)] border border-[color:var(--color-ink)]/14 rounded-xl px-4 py-3 text-[14px] leading-[1.5] outline-none focus:border-[color:var(--color-forest)] resize-y"
        />
        <div className="mt-1 text-[11px] text-[color:var(--color-ink-soft)] text-right">{description.length} / 4000</div>
      </div>

      {err ? <div className="text-[12.5px] text-[color:var(--color-terracotta)]">{err}</div> : null}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push('/support')}
          className="px-5 py-3 rounded-full text-[13px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!valid || submitting}
          className="px-6 py-3 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] text-[13.5px] font-medium hover:bg-[color:var(--color-forest-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Filing…' : 'File ticket'}
        </button>
      </div>
    </form>
  );
}
