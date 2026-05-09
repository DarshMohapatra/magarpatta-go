'use client';

import Link from 'next/link';
import { TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL, TICKET_PRIORITY_LABEL } from '@/lib/support-tickets';
import type { TicketCategory, TicketStatus, TicketPriority } from '@prisma/client';

interface Ticket {
  id: string;
  shortCode: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  resolvedAt: string | null;
  user: { id: string; name: string | null; phone: string };
  order: { id: string; vendorName: string | null; totalInr: number; placedAt: string; status: string } | null;
  assignedAgent: { id: string; name: string } | null;
  messages: { id: string; author: 'CUSTOMER' | 'HELPDESK'; authorName: string; body: string; createdAt: string }[];
}

/**
 * Read-only ticket detail for admin oversight. Admin can see the entire
 * thread and metadata but cannot reply, change status, or reassign — those
 * actions live exclusively in the helpdesk portal.
 */
export function AdminTicketClient({ ticket }: { ticket: Ticket }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
      <div>
        <Link href="/admin/support" className="text-[12px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]">← Queue</Link>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-[color:var(--color-saffron)]/15 text-[color:var(--color-gold)] font-medium">
            {TICKET_STATUS_LABEL[ticket.status]}
          </span>
          <span className="text-[11px] font-mono text-[color:var(--color-ink-soft)]">{ticket.shortCode}</span>
          <span className="text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-[color:var(--color-ink)]/8 text-[color:var(--color-ink-soft)] font-medium">View only</span>
        </div>
        <h1 className="mt-2 font-serif text-[28px] lg:text-[36px] leading-[1.1] tracking-[-0.01em]">{ticket.subject}</h1>
        <div className="mt-1 text-[12px] text-[color:var(--color-ink-soft)]">
          From <b className="text-[color:var(--color-ink)]">{ticket.user.name ?? '—'}</b> · +91 {ticket.user.phone}
          {ticket.assignedAgent ? ` · helpdesk: ${ticket.assignedAgent.name}` : ' · unassigned'}
        </div>

        {ticket.order ? (
          <div className="mt-4 inline-flex items-center gap-3 bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 rounded-xl px-4 py-3">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">Order context</div>
            <div className="text-[13px]">
              #{ticket.order.id.slice(-6).toUpperCase()} · {ticket.order.vendorName ?? '—'} · ₹{ticket.order.totalInr} · {ticket.order.status}
            </div>
          </div>
        ) : null}

        <ul className="mt-6 space-y-3">
          {ticket.messages.map((m) => (
            <li
              key={m.id}
              className={`rounded-2xl border p-4 ${
                m.author === 'HELPDESK'
                  ? 'bg-[color:var(--color-forest)]/8 border-[color:var(--color-forest)]/20'
                  : 'bg-[color:var(--color-paper)] border-[color:var(--color-ink)]/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10.5px] uppercase tracking-[0.14em] font-medium">
                  {m.author === 'HELPDESK'
                    ? <span className="text-[color:var(--color-forest)]">Helpdesk · {m.authorName}</span>
                    : <span className="text-[color:var(--color-saffron)]">Customer · {m.authorName}</span>}
                </div>
                <div className="text-[10.5px] text-[color:var(--color-ink-soft)]">
                  {new Date(m.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
              <p className="text-[13.5px] leading-[1.6] whitespace-pre-wrap">{m.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-8 bg-[color:var(--color-cream-soft)] rounded-2xl p-5 text-center text-[12.5px] text-[color:var(--color-ink-soft)]">
          Replies and status changes happen in the <b className="text-[color:var(--color-ink)]">helpdesk portal</b> (<code className="text-[12px]">/helpdesk</code>). Admin oversight is read-only.
        </div>
      </div>

      <aside className="space-y-3">
        <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-1.5">Status</div>
          <div className="text-[13px]">{TICKET_STATUS_LABEL[ticket.status]}</div>
        </div>
        <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-1.5">Priority</div>
          <div className="text-[13px]">{TICKET_PRIORITY_LABEL[ticket.priority]}</div>
        </div>
        <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-1.5">Category</div>
          <div className="text-[13px]">{TICKET_CATEGORY_LABEL[ticket.category]}</div>
        </div>
        <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-1.5">Assigned to</div>
          <div className="text-[13px]">{ticket.assignedAgent?.name ?? '—'}</div>
        </div>
        <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-1.5">Filed</div>
          <div className="text-[12.5px]">{new Date(ticket.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
          {ticket.resolvedAt ? (
            <>
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mt-3 mb-1">Resolved</div>
              <div className="text-[12.5px]">{new Date(ticket.resolvedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
