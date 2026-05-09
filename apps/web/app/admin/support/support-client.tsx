'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL, TICKET_PRIORITY_LABEL } from '@/lib/support-tickets';
import type { TicketCategory, TicketStatus, TicketPriority } from '@prisma/client';

type Scope = 'open' | 'resolved' | 'closed' | 'all';

interface TicketRow {
  id: string;
  shortCode: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  user: { name: string | null; phone: string };
  order: { id: string; vendorName: string | null; totalInr: number } | null;
  assignedAgent: { name: string } | null;
  messages: { author: 'CUSTOMER' | 'HELPDESK'; body: string; createdAt: string }[];
}

interface Counts { open: number; resolved: number; closed: number; }

export function AdminSupportClient() {
  const [scope, setScope] = useState<Scope>('open');
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [counts, setCounts] = useState<Counts>({ open: 0, resolved: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load(s: Scope) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/support?scope=${s}`, { cache: 'no-store' });
      const body = await res.json();
      if (!body.ok) { setErr(body.error ?? 'Could not load'); setLoading(false); return; }
      setTickets(body.tickets);
      setCounts(body.counts);
      setErr(null);
    } catch { setErr('Network error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(scope); }, [scope]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Support queue</div>
          <h1 className="mt-2 font-serif text-[36px] leading-[1.05] tracking-[-0.01em]">
            Customer <span className="italic text-[color:var(--color-forest)]">complaints.</span>
          </h1>
        </div>
        <div className="flex gap-2">
          {(['open', 'resolved', 'closed', 'all'] as Scope[]).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] border transition-colors ${
                scope === s
                  ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] border-transparent'
                  : 'bg-[color:var(--color-paper)] text-[color:var(--color-ink-soft)] border-[color:var(--color-ink)]/14 hover:text-[color:var(--color-ink)]'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {s === 'open' ? ` · ${counts.open}` : s === 'resolved' ? ` · ${counts.resolved}` : s === 'closed' ? ` · ${counts.closed}` : ''}
            </button>
          ))}
        </div>
      </div>

      {err ? <div className="mt-6 text-[12.5px] text-[color:var(--color-terracotta)]">{err}</div> : null}
      {loading ? <div className="mt-10 text-[13px] text-[color:var(--color-ink-soft)]">Loading…</div> : null}

      {!loading && tickets.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-10 text-center">
          <p className="font-serif text-[24px]">Empty queue.</p>
          <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)]">Nothing in this scope right now.</p>
        </div>
      ) : null}

      {!loading && tickets.length > 0 ? (
        <div className="mt-6 bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 overflow-hidden">
          <div className="grid grid-cols-[110px_1fr_140px_110px_100px_90px] gap-3 px-4 py-3 text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)] border-b border-[color:var(--color-ink)]/10">
            <div>Ticket</div>
            <div>Subject · Customer</div>
            <div>Category</div>
            <div>Status</div>
            <div>Priority</div>
            <div className="text-right">Filed</div>
          </div>
          <ul className="divide-y divide-[color:var(--color-ink)]/8">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/admin/support/${t.id}`}
                  className="grid grid-cols-[110px_1fr_140px_110px_100px_90px] gap-3 px-4 py-3.5 text-[13px] hover:bg-[color:var(--color-cream)] transition-colors"
                >
                  <div className="font-mono text-[12px] text-[color:var(--color-ink-soft)] self-center">{t.shortCode}</div>
                  <div className="min-w-0 self-center">
                    <div className="font-medium truncate">{t.subject}</div>
                    <div className="text-[11.5px] text-[color:var(--color-ink-soft)] truncate">
                      {t.user.name ?? '—'} · +91 {t.user.phone}{t.order ? ` · order #${t.order.id.slice(-6).toUpperCase()}` : ''}
                    </div>
                  </div>
                  <div className="self-center text-[12px]">{TICKET_CATEGORY_LABEL[t.category]}</div>
                  <div className="self-center">
                    <span className="text-[10.5px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full bg-[color:var(--color-saffron)]/15 text-[color:var(--color-gold)] font-medium">
                      {TICKET_STATUS_LABEL[t.status]}
                    </span>
                  </div>
                  <div className="self-center">
                    <span className={`text-[11px] uppercase tracking-[0.12em] font-medium ${
                      t.priority === 'URGENT' ? 'text-[color:var(--color-terracotta)]' :
                      t.priority === 'HIGH'   ? 'text-[color:var(--color-saffron)]' :
                                                'text-[color:var(--color-ink-soft)]'
                    }`}>{TICKET_PRIORITY_LABEL[t.priority]}</span>
                  </div>
                  <div className="self-center text-right text-[11.5px] text-[color:var(--color-ink-soft)]">
                    {new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
