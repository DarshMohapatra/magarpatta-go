'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL, TICKET_PRIORITY_LABEL,
  TICKET_CHANNEL_LABEL, SUPPORT_TEAM_LABEL,
} from '@/lib/support-tickets';
import type {
  TicketCategory, TicketStatus, TicketPriority, TicketChannel, SupportTeam,
} from '@prisma/client';

type Scope = 'open' | 'resolved' | 'closed' | 'all';

interface TicketRow {
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
  user: { name: string | null; phone: string };
  order: { id: string; vendorName: string | null; totalInr: number } | null;
  assignedAgent: { name: string } | null;
  messages: { author: 'CUSTOMER' | 'HELPDESK'; body: string; createdAt: string }[];
}

interface Counts { open: number; resolved: number; closed: number; }

const CHANNELS: TicketChannel[]   = ['IN_APP','EMAIL','WHATSAPP','PHONE','SOCIAL'];
const TEAMS:    SupportTeam[]     = ['GENERAL','BILLING','RIDER_OPS','VENDOR_OPS','ESCALATIONS'];

function fmtDue(iso: string | null, now: number): { label: string; tone: 'ok'|'warn'|'late'|'idle' } {
  if (!iso) return { label: '—', tone: 'idle' };
  const due = new Date(iso).getTime();
  const mins = Math.round((due - now) / 60_000);
  if (mins < 0) return { label: `−${absLabel(-mins)}`, tone: 'late' };
  if (mins < 30) return { label: `in ${absLabel(mins)}`, tone: 'warn' };
  return { label: `in ${absLabel(mins)}`, tone: 'ok' };
}

function absLabel(m: number): string {
  if (m < 60) return `${m}m`;
  if (m < 24 * 60) return `${(m / 60).toFixed(1)}h`;
  return `${(m / (24 * 60)).toFixed(1)}d`;
}

export function HelpdeskQueueClient({ scope: initialScope }: { scope: Scope }) {
  const [scope, setScope] = useState<Scope>(initialScope);
  const [channel, setChannel] = useState<TicketChannel | 'ALL'>('ALL');
  const [team, setTeam]       = useState<SupportTeam | 'ALL'>('ALL');
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [counts, setCounts]   = useState<Counts>({ open: 0, resolved: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ scope });
      if (channel !== 'ALL') params.set('channel', channel);
      if (team !== 'ALL')    params.set('team', team);
      const res = await fetch(`/api/helpdesk/tickets?${params}`, { cache: 'no-store' });
      const body = await res.json();
      if (!body.ok) { setErr(body.error ?? 'Could not load'); setLoading(false); return; }
      setTickets(body.tickets);
      setCounts(body.counts);
      setErr(null);
    } catch { setErr('Network error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [scope, channel, team]);

  const now = Date.now();

  return (
    <div>
      {/* Gradient-warm hero — partner parity */}
      <div className="relative overflow-hidden rounded-[var(--radius-2xl)] gradient-warm text-white p-5 sm:p-6 shadow-[var(--shadow-glow)]">
        <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.18em] font-semibold opacity-90">Customer queue</div>
            <h1 className="mt-2 font-display text-[26px] sm:text-[30px] leading-tight tracking-tight">
              Tickets, live.
            </h1>
            <p className="mt-1 text-[12.5px] opacity-90">
              {counts.open} open · {counts.resolved} resolved · in-app + email + WhatsApp
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-2 flex-wrap">
        {(['open', 'resolved', 'closed', 'all'] as Scope[]).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] border transition-colors ${
              scope === s
                ? 'bg-[color:var(--color-primary)] text-[color:var(--color-background)] border-transparent'
                : 'bg-[color:var(--color-surface)] text-[color:var(--color-muted)] border-[color:var(--color-foreground)]/14 hover:text-[color:var(--color-foreground)]'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s === 'open' ? ` · ${counts.open}` : s === 'resolved' ? ` · ${counts.resolved}` : s === 'closed' ? ` · ${counts.closed}` : ''}
          </button>
        ))}
      </div>

      <div className="mt-5 flex gap-2 flex-wrap items-center">
        <span className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-muted)] mr-2">Channel</span>
        <FilterPill active={channel === 'ALL'} onClick={() => setChannel('ALL')} label="All" />
        {CHANNELS.map((c) => (
          <FilterPill key={c} active={channel === c} onClick={() => setChannel(c)} label={TICKET_CHANNEL_LABEL[c]} />
        ))}
      </div>
      <div className="mt-2 flex gap-2 flex-wrap items-center">
        <span className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-muted)] mr-2">Team</span>
        <FilterPill active={team === 'ALL'} onClick={() => setTeam('ALL')} label="All" />
        {TEAMS.map((t) => (
          <FilterPill key={t} active={team === t} onClick={() => setTeam(t)} label={SUPPORT_TEAM_LABEL[t]} />
        ))}
      </div>

      {err ? <div className="mt-6 text-[12.5px] text-[color:var(--color-terracotta)]">{err}</div> : null}
      {loading ? <div className="mt-10 text-[13px] text-[color:var(--color-muted)]">Loading…</div> : null}

      {!loading && tickets.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-[color:var(--color-foreground)]/10 bg-[color:var(--color-surface)] p-10 text-center">
          <p className="font-display text-[24px]">Empty queue.</p>
          <p className="mt-2 text-[13px] text-[color:var(--color-muted)]">Nothing in this scope right now.</p>
        </div>
      ) : null}

      {!loading && tickets.length > 0 ? (
        <div className="mt-6 bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-foreground)]/10 overflow-hidden">
          <div className="hidden md:grid grid-cols-[100px_1fr_120px_90px_110px_80px_90px] gap-3 px-4 py-3 text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-muted)] border-b border-[color:var(--color-foreground)]/10">
            <div>Ticket</div>
            <div>Subject · Customer</div>
            <div>Channel · Team</div>
            <div>Status</div>
            <div>SLA</div>
            <div>Priority</div>
            <div className="text-right">Filed</div>
          </div>
          <ul className="divide-y divide-[color:var(--color-foreground)]/8">
            {tickets.map((t) => {
              // For an open ticket we surface the most-pressing SLA window: if
              // first-response hasn't happened yet, show that; otherwise show
              // the resolve target. For terminal states we drop the badge.
              const slaIso = t.firstResponseAt ? t.resolveDueAt : t.firstResponseDueAt;
              const sla = fmtDue(slaIso, now);
              const breached = t.firstResponseBreached || t.resolveBreached;

              return (
                <li key={t.id}>
                  <Link
                    href={`/helpdesk/${t.id}`}
                    className="block md:grid md:grid-cols-[100px_1fr_120px_90px_110px_80px_90px] gap-3 px-4 py-3.5 text-[13px] hover:bg-[color:var(--color-background)] transition-colors"
                  >
                    <div className="font-mono text-[12px] text-[color:var(--color-muted)] md:self-center">{t.shortCode}</div>
                    <div className="min-w-0 md:self-center">
                      <div className="font-medium truncate">{t.subject}</div>
                      <div className="text-[11.5px] text-[color:var(--color-muted)] truncate">
                        {t.user.name ?? '—'} · +91 {t.user.phone}{t.order ? ` · order #${t.order.id.slice(-6).toUpperCase()}` : ''}
                      </div>
                    </div>
                    <div className="md:self-center text-[11.5px] text-[color:var(--color-muted)]">
                      <span className="text-[color:var(--color-primary)] font-medium">{TICKET_CHANNEL_LABEL[t.channel]}</span>
                      {' · '}
                      {SUPPORT_TEAM_LABEL[t.team]}
                    </div>
                    <div className="md:self-center">
                      <span className="text-[10.5px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full bg-[color:var(--color-saffron)]/15 text-[color:var(--color-gold)] font-medium">
                        {TICKET_STATUS_LABEL[t.status]}
                      </span>
                    </div>
                    <div className="md:self-center">
                      <span className={`text-[11.5px] font-medium ${
                        sla.tone === 'late' ? 'text-[color:var(--color-terracotta)]' :
                        sla.tone === 'warn' ? 'text-[color:var(--color-saffron)]' :
                        sla.tone === 'ok'   ? 'text-[color:var(--color-primary)]' :
                                              'text-[color:var(--color-muted)]'
                      }`}>
                        {sla.label}{breached ? ' · breach' : ''}
                      </span>
                    </div>
                    <div className="md:self-center">
                      <span className={`text-[11px] uppercase tracking-[0.12em] font-medium ${
                        t.priority === 'URGENT' ? 'text-[color:var(--color-terracotta)]' :
                        t.priority === 'HIGH'   ? 'text-[color:var(--color-saffron)]' :
                                                  'text-[color:var(--color-muted)]'
                      }`}>{TICKET_PRIORITY_LABEL[t.priority]}</span>
                      {t.escalationLevel > 0 ? <span className="ml-1 text-[10px] text-[color:var(--color-terracotta)]">L{t.escalationLevel}</span> : null}
                    </div>
                    <div className="md:self-center md:text-right text-[11.5px] text-[color:var(--color-muted)]">
                      {new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function FilterPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-[11.5px] border transition-colors ${
        active
          ? 'bg-[color:var(--color-primary)] text-[color:var(--color-background)] border-transparent'
          : 'bg-[color:var(--color-surface)] text-[color:var(--color-muted)] border-[color:var(--color-foreground)]/14 hover:text-[color:var(--color-foreground)]'
      }`}
    >{label}</button>
  );
}
