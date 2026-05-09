'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  TICKET_CATEGORY_LABEL, TICKET_PRIORITY_LABEL,
  TICKET_CHANNEL_LABEL, SUPPORT_TEAM_LABEL,
} from '@/lib/support-tickets';
import type { TicketCategory, TicketChannel, SupportTeam, TicketPriority, EscalationTrigger } from '@prisma/client';

interface DurationStats { avg: number | null; p50: number | null; p90: number | null; sampleSize: number }
interface Bucket<K extends string> { key: K; count: number }

interface Analytics {
  windowDays: number;
  generatedAt: string;
  volume: {
    total: number;
    byCategory: Bucket<TicketCategory>[];
    byChannel:  Bucket<TicketChannel>[];
    byTeam:     Bucket<SupportTeam>[];
    byPriority: Bucket<TicketPriority>[];
  };
  responseTimes: {
    firstResponseMinutes: DurationStats;
    resolutionMinutes:    DurationStats;
  };
  sla: {
    firstResponseBreaches: number;
    resolveBreaches: number;
    firstResponseBreachRate: number;
    resolveBreachRate: number;
  };
  agents: Array<{ id: string; name: string; handled: number; avgResolutionMinutes: number | null; breaches: number }>;
  backlog: { open: number; inReview: number; awaitingCustomer: number; oldestOpenAgeMinutes: number | null };
  escalations: { total: number; byTrigger: Bucket<EscalationTrigger>[] };
  kb: {
    suggested: number; opened: number; publicViews: number; suggestionCtr: number;
    topArticles: Array<{ id: string; title: string; slug: string; suggestions: number; opens: number; ctr: number }>;
  };
}

const WINDOWS = [7, 30, 90] as const;

function fmtMinutes(m: number | null): string {
  if (m === null) return '—';
  if (m < 60) return `${m}m`;
  if (m < 24 * 60) return `${(m / 60).toFixed(1)}h`;
  return `${(m / (24 * 60)).toFixed(1)}d`;
}

function fmtPct(r: number): string {
  return `${(r * 100).toFixed(1)}%`;
}

export function SupportAnalyticsClient() {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load(d: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/support?days=${d}`, { cache: 'no-store' });
      const body = await res.json();
      if (!body.ok) { setErr(body.error ?? 'Could not load'); setLoading(false); return; }
      setData(body); setErr(null);
    } catch { setErr('Network error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(days); }, [days]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Support analytics</div>
          <h1 className="mt-2 font-serif text-[36px] leading-[1.05] tracking-[-0.01em]">
            Resolution, <span className="italic text-[color:var(--color-forest)]">measured.</span>
          </h1>
        </div>
        <div className="flex gap-2">
          {WINDOWS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] border transition-colors ${
                days === d
                  ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] border-transparent'
                  : 'bg-[color:var(--color-paper)] text-[color:var(--color-ink-soft)] border-[color:var(--color-ink)]/14 hover:text-[color:var(--color-ink)]'
              }`}
            >Last {d}d</button>
          ))}
        </div>
      </div>

      {err ? <div className="mt-6 text-[12.5px] text-[color:var(--color-terracotta)]">{err}</div> : null}
      {loading ? <div className="mt-10 text-[13px] text-[color:var(--color-ink-soft)]">Loading…</div> : null}

      {!loading && data ? (
        <>
          {/* Top KPI strip */}
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Tickets" value={String(data.volume.total)} sub={`last ${data.windowDays} days`} />
            <Kpi label="First response (avg)" value={fmtMinutes(data.responseTimes.firstResponseMinutes.avg)} sub={`p50 ${fmtMinutes(data.responseTimes.firstResponseMinutes.p50)} · p90 ${fmtMinutes(data.responseTimes.firstResponseMinutes.p90)}`} />
            <Kpi label="Resolution (avg)" value={fmtMinutes(data.responseTimes.resolutionMinutes.avg)} sub={`p50 ${fmtMinutes(data.responseTimes.resolutionMinutes.p50)} · p90 ${fmtMinutes(data.responseTimes.resolutionMinutes.p90)}`} />
            <Kpi
              label="SLA breach"
              value={`${fmtPct(data.sla.firstResponseBreachRate)} / ${fmtPct(data.sla.resolveBreachRate)}`}
              sub="first response · resolve"
              tone={data.sla.firstResponseBreachRate > 0.05 || data.sla.resolveBreachRate > 0.05 ? 'warn' : 'ok'}
            />
          </div>

          {/* Backlog snapshot */}
          <Section title="Live backlog">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="Open" value={String(data.backlog.open)} />
              <Kpi label="In review" value={String(data.backlog.inReview)} />
              <Kpi label="Awaiting customer" value={String(data.backlog.awaitingCustomer)} />
              <Kpi label="Oldest open" value={fmtMinutes(data.backlog.oldestOpenAgeMinutes)} />
            </div>
          </Section>

          {/* Distribution */}
          <Section title="Volume distribution">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Distribution title="By category" rows={data.volume.byCategory.map((b) => ({ label: TICKET_CATEGORY_LABEL[b.key], count: b.count }))} total={data.volume.total} />
              <Distribution title="By channel"  rows={data.volume.byChannel.map((b)  => ({ label: TICKET_CHANNEL_LABEL[b.key],  count: b.count }))} total={data.volume.total} />
              <Distribution title="By team"     rows={data.volume.byTeam.map((b)     => ({ label: SUPPORT_TEAM_LABEL[b.key],    count: b.count }))} total={data.volume.total} />
              <Distribution title="By priority" rows={data.volume.byPriority.map((b) => ({ label: b.key,                          count: b.count }))} total={data.volume.total} />
            </div>
          </Section>

          {/* Agents */}
          <Section title="Agents">
            {data.agents.length === 0 ? (
              <p className="text-[13px] text-[color:var(--color-ink-soft)]">No assigned tickets in this window.</p>
            ) : (
              <ul className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 overflow-hidden divide-y divide-[color:var(--color-ink)]/8">
                {data.agents.map((a) => (
                  <li key={a.id} className="grid grid-cols-[1fr_90px_120px_90px] gap-3 px-5 py-3 text-[13px]">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-[color:var(--color-ink-soft)]">{a.handled} handled</div>
                    <div className="text-[color:var(--color-ink-soft)]">avg {fmtMinutes(a.avgResolutionMinutes)}</div>
                    <div className={`text-right ${a.breaches > 0 ? 'text-[color:var(--color-terracotta)]' : 'text-[color:var(--color-ink-soft)]'}`}>
                      {a.breaches} breach{a.breaches === 1 ? '' : 'es'}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Escalations */}
          <Section title="Escalations">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Kpi label="Total" value={String(data.escalations.total)} sub={`last ${data.windowDays} days`} />
              <Distribution
                title="By trigger"
                rows={data.escalations.byTrigger.map((b) => ({ label: b.key.toLowerCase().replace(/_/g, ' '), count: b.count }))}
                total={data.escalations.total}
              />
            </div>
          </Section>

          {/* KB */}
          <Section title="Knowledge base">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="Suggestions" value={String(data.kb.suggested)} sub="surfaced to agents" />
              <Kpi label="Opens" value={String(data.kb.opened)} sub={`CTR ${fmtPct(data.kb.suggestionCtr)}`} />
              <Kpi label="Public reads" value={String(data.kb.publicViews)} sub="anonymous /help views" />
              <Kpi label="Articles ranked" value={String(data.kb.topArticles.length)} />
            </div>
            {data.kb.topArticles.length > 0 ? (
              <ul className="mt-4 bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 overflow-hidden divide-y divide-[color:var(--color-ink)]/8">
                {data.kb.topArticles.map((a) => (
                  <li key={a.id} className="grid grid-cols-[1fr_90px_90px_90px] gap-3 px-5 py-3 text-[13px]">
                    <Link href={`/admin/kb/${a.id}`} className="font-medium hover:underline truncate">{a.title}</Link>
                    <div className="text-[color:var(--color-ink-soft)]">{a.suggestions} sug</div>
                    <div className="text-[color:var(--color-ink-soft)]">{a.opens} open</div>
                    <div className="text-right text-[color:var(--color-ink-soft)]">CTR {fmtPct(a.ctr)}</div>
                  </li>
                ))}
              </ul>
            ) : null}
          </Section>
        </>
      ) : null}
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'ok' | 'warn' }) {
  const valueColor = tone === 'warn' ? 'text-[color:var(--color-terracotta)]' : '';
  return (
    <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]">{label}</div>
      <div className={`mt-1 font-serif text-[28px] leading-[1.1] ${valueColor}`}>{value}</div>
      {sub ? <div className="mt-1 text-[11.5px] text-[color:var(--color-ink-soft)]">{sub}</div> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Distribution({ title, rows, total }: { title: string; rows: Array<{ label: string; count: number }>; total: number }) {
  return (
    <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)] mb-3">{title}</div>
      {rows.length === 0 ? (
        <div className="text-[12px] text-[color:var(--color-ink-soft)]">No data.</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const pct = total === 0 ? 0 : (r.count / total) * 100;
            return (
              <li key={r.label}>
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="capitalize">{r.label}</span>
                  <span className="text-[color:var(--color-ink-soft)]">{r.count} · {pct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-[color:var(--color-ink)]/8 rounded-full overflow-hidden">
                  <div className="h-full bg-[color:var(--color-forest)]" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
