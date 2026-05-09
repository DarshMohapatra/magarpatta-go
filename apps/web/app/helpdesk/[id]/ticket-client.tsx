'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL, TICKET_PRIORITY_LABEL,
  TICKET_CHANNEL_LABEL, SUPPORT_TEAM_LABEL,
} from '@/lib/support-tickets';
import type {
  TicketCategory, TicketStatus, TicketPriority, TicketChannel,
  SupportTeam, EscalationTrigger,
} from '@prisma/client';

interface EscalationEvent {
  id: string;
  trigger: EscalationTrigger;
  oldPriority: TicketPriority;
  newPriority: TicketPriority;
  oldTeam: SupportTeam | null;
  newTeam: SupportTeam | null;
  reason: string;
  occurredAt: string;
}

interface Ticket {
  id: string;
  shortCode: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  channel: TicketChannel;
  team: SupportTeam;
  escalationLevel: number;
  firstResponseAt: string | null;
  firstResponseDueAt: string | null;
  firstResponseBreached: boolean;
  resolveDueAt: string | null;
  resolveBreached: boolean;
  createdAt: string;
  resolvedAt: string | null;
  user: { id: string; name: string | null; phone: string };
  order: { id: string; vendorName: string | null; totalInr: number; placedAt: string; status: string } | null;
  assignedAgent: { id: string; name: string } | null;
  messages: { id: string; author: 'CUSTOMER' | 'HELPDESK'; authorName: string; body: string; createdAt: string }[];
  escalationEvents: EscalationEvent[];
}

interface KbSuggestion {
  id: string;
  slug: string;
  title: string;
  category: TicketCategory | null;
  tags: string[];
  isPublic: boolean;
  excerpt: string;
}

const STATUS_OPTIONS: TicketStatus[] = ['OPEN', 'IN_REVIEW', 'AWAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];
const PRIORITY_OPTIONS: TicketPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const CATEGORY_OPTIONS: TicketCategory[] = ['WRONG_ITEM','MISSING_ITEM','QUALITY','LATE_DELIVERY','RIDER_BEHAVIOUR','PAYMENT','REFUND','ACCOUNT','OTHER'];
const TEAM_OPTIONS: SupportTeam[] = ['GENERAL','BILLING','RIDER_OPS','VENDOR_OPS','ESCALATIONS'];

function fmtRelative(isoOrDate: string | null, now: number): string {
  if (!isoOrDate) return '—';
  const t = new Date(isoOrDate).getTime();
  const m = Math.round((t - now) / 60_000);
  if (m === 0)  return 'now';
  if (m > 0) {
    if (m < 60) return `in ${m}m`;
    if (m < 24 * 60) return `in ${(m / 60).toFixed(1)}h`;
    return `in ${(m / (24 * 60)).toFixed(1)}d`;
  }
  const ago = -m;
  if (ago < 60) return `${ago}m ago`;
  if (ago < 24 * 60) return `${(ago / 60).toFixed(1)}h ago`;
  return `${(ago / (24 * 60)).toFixed(1)}d ago`;
}

export function HelpdeskTicketClient({ ticket }: { ticket: Ticket }) {
  const router = useRouter();
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [kb, setKb] = useState<KbSuggestion[]>([]);
  const [kbLoading, setKbLoading] = useState(true);

  // Pull KB suggestions once on mount. The endpoint also records SUGGESTED
  // views for analytics.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/helpdesk/kb/suggest?ticketId=${ticket.id}`, { cache: 'no-store' });
        const body = await res.json();
        if (!cancelled && body.ok) setKb(body.articles);
      } catch { /* non-fatal */ }
      finally { if (!cancelled) setKbLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [ticket.id]);

  async function patch(payload: Record<string, unknown>) {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/helpdesk/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!body.ok) { setErr(body.error ?? 'Could not update'); return; }
      router.refresh();
    } catch { setErr('Network error'); }
    finally { setBusy(false); }
  }

  async function sendReply(resolve: boolean) {
    if (!reply.trim() || busy) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/helpdesk/tickets/${ticket.id}/reply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: reply, resolve }),
      });
      const body = await res.json();
      if (!body.ok) { setErr(body.error ?? 'Could not send'); return; }
      setReply(''); router.refresh();
    } catch { setErr('Network error'); }
    finally { setBusy(false); }
  }

  function onKbOpen(articleId: string) {
    fetch('/api/helpdesk/kb/suggest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ticketId: ticket.id, articleId }),
    }).catch(() => {});
  }

  const isClosed = ticket.status === 'CLOSED';
  const now = Date.now();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      <div>
        <Link href="/helpdesk" className="text-[12px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]">← Queue</Link>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-[color:var(--color-saffron)]/15 text-[color:var(--color-gold)] font-medium">
            {TICKET_STATUS_LABEL[ticket.status]}
          </span>
          <span className="text-[10.5px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-[color:var(--color-forest)]/12 text-[color:var(--color-forest)] font-medium">
            {TICKET_CHANNEL_LABEL[ticket.channel]}
          </span>
          <span className="text-[10.5px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-[color:var(--color-ink)]/8 font-medium">
            {SUPPORT_TEAM_LABEL[ticket.team]}
          </span>
          {ticket.escalationLevel > 0 ? (
            <span className="text-[10.5px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-[color:var(--color-terracotta)]/15 text-[color:var(--color-terracotta)] font-medium">
              Escalated · L{ticket.escalationLevel}
            </span>
          ) : null}
          <span className="text-[11px] font-mono text-[color:var(--color-ink-soft)]">{ticket.shortCode}</span>
        </div>
        <h1 className="mt-2 font-serif text-[28px] lg:text-[36px] leading-[1.1] tracking-[-0.01em]">{ticket.subject}</h1>
        <div className="mt-1 text-[12px] text-[color:var(--color-ink-soft)]">
          From <b className="text-[color:var(--color-ink)]">{ticket.user.name ?? '—'}</b> · +91 {ticket.user.phone}
          {ticket.assignedAgent ? ` · assigned to ${ticket.assignedAgent.name}` : ' · unassigned'}
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

        {ticket.escalationEvents.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)] mb-2">Escalation history</h2>
            <ul className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 divide-y divide-[color:var(--color-ink)]/8 overflow-hidden">
              {ticket.escalationEvents.map((e) => (
                <li key={e.id} className="px-4 py-3 text-[12.5px]">
                  <div className="flex justify-between gap-2">
                    <span>{e.reason}</span>
                    <span className="text-[color:var(--color-ink-soft)] whitespace-nowrap">{fmtRelative(e.occurredAt, now)}</span>
                  </div>
                  <div className="mt-1 text-[11.5px] text-[color:var(--color-ink-soft)]">
                    Priority {e.oldPriority} → {e.newPriority}
                    {e.newTeam ? ` · Team → ${SUPPORT_TEAM_LABEL[e.newTeam]}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {isClosed ? (
          <div className="mt-8 bg-[color:var(--color-cream-soft)] rounded-2xl p-5 text-center text-[13px] text-[color:var(--color-ink-soft)]">
            Ticket is closed. Re-open by changing status from the sidebar.
          </div>
        ) : (
          <div className="mt-6 bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
            <label className="block text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)] mb-2">Reply to customer</label>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="Acknowledge, ask a question, or close the loop with a resolution."
              className="w-full bg-[color:var(--color-cream)] border border-[color:var(--color-ink)]/14 rounded-xl px-3 py-2.5 text-[13.5px] leading-[1.55] outline-none focus:border-[color:var(--color-forest)] resize-y"
            />
            {err ? <div className="mt-2 text-[12.5px] text-[color:var(--color-terracotta)]">{err}</div> : null}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => sendReply(false)}
                disabled={!reply.trim() || busy}
                className="px-4 py-2.5 rounded-full border border-[color:var(--color-ink)]/14 text-[12.5px] hover:bg-[color:var(--color-cream)] disabled:opacity-50"
              >{busy ? 'Sending…' : 'Send reply'}</button>
              <button
                type="button"
                onClick={() => sendReply(true)}
                disabled={!reply.trim() || busy}
                className="px-4 py-2.5 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] text-[12.5px] font-medium hover:bg-[color:var(--color-forest-dark)] transition-colors disabled:opacity-50"
              >{busy ? 'Sending…' : 'Reply & resolve'}</button>
            </div>
          </div>
        )}
      </div>

      <aside className="space-y-3">
        <SlaPanel ticket={ticket} now={now} />

        <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-2">Status</div>
          <select
            value={ticket.status}
            onChange={(e) => patch({ status: e.target.value })}
            disabled={busy}
            className="w-full bg-[color:var(--color-cream)] border border-[color:var(--color-ink)]/14 rounded-xl px-3 py-2 text-[13px] outline-none"
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{TICKET_STATUS_LABEL[s]}</option>)}
          </select>
        </div>

        <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-2">Priority</div>
          <select
            value={ticket.priority}
            onChange={(e) => patch({ priority: e.target.value })}
            disabled={busy}
            className="w-full bg-[color:var(--color-cream)] border border-[color:var(--color-ink)]/14 rounded-xl px-3 py-2 text-[13px] outline-none"
          >
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{TICKET_PRIORITY_LABEL[p]}</option>)}
          </select>
        </div>

        <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-2">Team</div>
          <select
            value={ticket.team}
            onChange={(e) => patch({ team: e.target.value })}
            disabled={busy}
            className="w-full bg-[color:var(--color-cream)] border border-[color:var(--color-ink)]/14 rounded-xl px-3 py-2 text-[13px] outline-none"
          >
            {TEAM_OPTIONS.map((t) => <option key={t} value={t}>{SUPPORT_TEAM_LABEL[t]}</option>)}
          </select>
        </div>

        <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-2">Category</div>
          <select
            value={ticket.category}
            onChange={(e) => patch({ category: e.target.value })}
            disabled={busy}
            className="w-full bg-[color:var(--color-cream)] border border-[color:var(--color-ink)]/14 rounded-xl px-3 py-2 text-[13px] outline-none"
          >
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{TICKET_CATEGORY_LABEL[c]}</option>)}
          </select>
        </div>

        <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">KB suggestions</div>
            {kbLoading ? <span className="text-[10px] text-[color:var(--color-ink-soft)]">…</span> : null}
          </div>
          {!kbLoading && kb.length === 0 ? (
            <p className="text-[12px] text-[color:var(--color-ink-soft)]">No matching articles. Write one in <Link href="/admin/kb" className="underline">Knowledge</Link>.</p>
          ) : null}
          <ul className="space-y-2">
            {kb.map((a) => (
              <li key={a.id}>
                <Link
                  href={a.isPublic ? `/help/${a.slug}` : `/admin/kb/${a.id}`}
                  target="_blank"
                  onClick={() => onKbOpen(a.id)}
                  className="block rounded-xl border border-[color:var(--color-ink)]/10 px-3 py-2.5 hover:bg-[color:var(--color-cream)] transition-colors"
                >
                  <div className="text-[12.5px] font-medium">{a.title}</div>
                  <div className="mt-0.5 text-[11px] text-[color:var(--color-ink-soft)] line-clamp-2">{a.excerpt}</div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-2">Filed</div>
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

type SlaTone = 'ok' | 'pending' | 'late' | 'idle';
interface SlaRow { label: string; value: string; breached: boolean; tone: SlaTone }

function SlaPanel({ ticket, now }: { ticket: Ticket; now: number }) {
  const frRow: SlaRow = (() => {
    if (ticket.firstResponseAt) {
      const minsToFirst = Math.round((new Date(ticket.firstResponseAt).getTime() - new Date(ticket.createdAt).getTime()) / 60_000);
      return { label: 'First response', value: `met in ${fmtMinsAbsolute(minsToFirst)}`, breached: ticket.firstResponseBreached, tone: ticket.firstResponseBreached ? 'late' : 'ok' };
    }
    if (!ticket.firstResponseDueAt) return { label: 'First response', value: '—', breached: false, tone: 'idle' };
    const due = new Date(ticket.firstResponseDueAt).getTime();
    const overdue = due < now;
    return { label: 'First response', value: overdue ? `overdue ${fmtMinsAbsolute(Math.round((now - due) / 60_000))}` : `due in ${fmtMinsAbsolute(Math.round((due - now) / 60_000))}`, breached: overdue, tone: overdue ? 'late' : 'pending' };
  })();

  const resRow: SlaRow = (() => {
    if (ticket.resolvedAt) {
      const mins = Math.round((new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime()) / 60_000);
      return { label: 'Resolution', value: `closed in ${fmtMinsAbsolute(mins)}`, breached: ticket.resolveBreached, tone: ticket.resolveBreached ? 'late' : 'ok' };
    }
    if (!ticket.resolveDueAt) return { label: 'Resolution', value: '—', breached: false, tone: 'idle' };
    const due = new Date(ticket.resolveDueAt).getTime();
    const overdue = due < now;
    return { label: 'Resolution', value: overdue ? `overdue ${fmtMinsAbsolute(Math.round((now - due) / 60_000))}` : `due in ${fmtMinsAbsolute(Math.round((due - now) / 60_000))}`, breached: overdue, tone: overdue ? 'late' : 'pending' };
  })();

  return (
    <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-3">SLA</div>
      <Row {...frRow} />
      <div className="h-2" />
      <Row {...resRow} />
    </div>
  );
}

function Row({ label, value, breached, tone }: SlaRow) {
  const valueColor =
    tone === 'late'    ? 'text-[color:var(--color-terracotta)]' :
    tone === 'ok'      ? 'text-[color:var(--color-forest)]'     :
    tone === 'pending' ? 'text-[color:var(--color-saffron)]'    : 'text-[color:var(--color-ink-soft)]';
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-[color:var(--color-ink-soft)]">{label}</span>
      <span className={`text-[12.5px] font-medium ${valueColor}`}>
        {value}{breached ? ' · breach' : ''}
      </span>
    </div>
  );
}

function fmtMinsAbsolute(m: number): string {
  const x = Math.abs(m);
  if (x < 60) return `${x}m`;
  if (x < 24 * 60) return `${(x / 60).toFixed(1)}h`;
  return `${(x / (24 * 60)).toFixed(1)}d`;
}
