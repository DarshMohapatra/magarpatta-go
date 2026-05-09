'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || submitting) return;
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error ?? 'Could not send');
        setSubmitting(false);
        return;
      }
      setBody('');
      setSubmitting(false);
      router.refresh();
    } catch {
      setErr('Network error. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 rounded-2xl p-4">
      <label className="block text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)] mb-2">Add a reply</label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={4000}
        placeholder="More detail, a clarification, or just 'thanks'."
        className="w-full bg-[color:var(--color-cream)] border border-[color:var(--color-ink)]/14 rounded-xl px-3 py-2.5 text-[13.5px] leading-[1.55] outline-none focus:border-[color:var(--color-forest)] resize-y"
      />
      {err ? <div className="mt-2 text-[12.5px] text-[color:var(--color-terracotta)]">{err}</div> : null}
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={!body.trim() || submitting}
          className="px-5 py-2.5 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] text-[13px] font-medium hover:bg-[color:var(--color-forest-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Sending…' : 'Send reply'}
        </button>
      </div>
    </form>
  );
}
