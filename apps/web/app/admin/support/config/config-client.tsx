'use client';

import { useEffect, useState } from 'react';
import {
  TICKET_PRIORITY_LABEL, SUPPORT_TEAM_LABEL,
  TICKET_CATEGORY_LABEL, TICKET_CHANNEL_LABEL,
} from '@/lib/support-tickets';
import type {
  TicketPriority, SupportTeam, TicketCategory, TicketChannel, EscalationTrigger,
} from '@prisma/client';

const PRIORITIES: TicketPriority[] = ['LOW','NORMAL','HIGH','URGENT'];
const TEAMS:      SupportTeam[]    = ['GENERAL','BILLING','RIDER_OPS','VENDOR_OPS','ESCALATIONS'];
const CATS:       TicketCategory[] = ['WRONG_ITEM','MISSING_ITEM','QUALITY','LATE_DELIVERY','RIDER_BEHAVIOUR','PAYMENT','REFUND','ACCOUNT','OTHER'];
const CHANS:      TicketChannel[]  = ['IN_APP','EMAIL','WHATSAPP','PHONE','SOCIAL'];
const TRIGGERS:   EscalationTrigger[] = ['FIRST_RESPONSE_OVERDUE','RESOLVE_OVERDUE','CUSTOMER_REOPEN','INACTIVE_TICKET'];
type TabKey = 'sla' | 'routing' | 'escalation' | 'agents';

export function SupportConfigClient() {
  const [tab, setTab] = useState<TabKey>('sla');
  return (
    <div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Support config</div>
        <h1 className="mt-2 font-serif text-[36px] leading-[1.05] tracking-[-0.01em]">
          Rules, <span className="italic text-[color:var(--color-forest)]">codified.</span>
        </h1>
        <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)]">
          SLA targets, routing, escalation, and the helpdesk roster.
        </p>
      </div>

      <div className="mt-6 flex gap-2 flex-wrap">
        {(['sla','routing','escalation','agents'] as TabKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] border transition-colors ${
              tab === k
                ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] border-transparent'
                : 'bg-[color:var(--color-paper)] text-[color:var(--color-ink-soft)] border-[color:var(--color-ink)]/14 hover:text-[color:var(--color-ink)]'
            }`}
          >
            {k === 'sla' ? 'SLA policies' : k === 'routing' ? 'Routing' : k === 'escalation' ? 'Escalation' : 'Agents'}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === 'sla'        ? <SlaPanel /> : null}
        {tab === 'routing'    ? <RoutingPanel /> : null}
        {tab === 'escalation' ? <EscalationPanel /> : null}
        {tab === 'agents'     ? <AgentsPanel /> : null}
      </div>
    </div>
  );
}

// ─── SLA ────────────────────────────────────────────────────────────────────

interface SlaPolicy {
  id: string; name: string; priority: TicketPriority | null; team: SupportTeam | null;
  firstResponseMinutes: number; resolveMinutes: number;
  businessHoursOnly: boolean; active: boolean;
}

function SlaPanel() {
  const [items, setItems] = useState<SlaPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [priority, setPriority] = useState<TicketPriority | ''>('');
  const [team, setTeam] = useState<SupportTeam | ''>('');
  const [fr, setFr] = useState(60);
  const [rs, setRs] = useState(24 * 60);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/support/sla-policies', { cache: 'no-store' });
    const body = await res.json();
    if (body.ok) setItems(body.policies);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setBusy(true); setErr(null);
    const res = await fetch('/api/admin/support/sla-policies', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, priority: priority || null, team: team || null, firstResponseMinutes: fr, resolveMinutes: rs }),
    });
    const body = await res.json();
    if (!body.ok) { setErr(body.error ?? 'Could not create'); setBusy(false); return; }
    setName(''); setPriority(''); setTeam(''); setFr(60); setRs(24 * 60);
    setBusy(false); load();
  }

  async function toggleActive(p: SlaPolicy) {
    await fetch(`/api/admin/support/sla-policies/${p.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ active: !p.active }),
    });
    load();
  }

  async function destroy(p: SlaPolicy) {
    if (!confirm(`Deactivate "${p.name}"?`)) return;
    await fetch(`/api/admin/support/sla-policies/${p.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-6">
      <Card title="New policy" intro="Most-specific match wins. Leave priority and team empty for a catch-all.">
        <Grid>
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className="ip" /></Field>
          <Field label="Priority">
            <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority | '')} className="ip">
              <option value="">— Any —</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{TICKET_PRIORITY_LABEL[p]}</option>)}
            </select>
          </Field>
          <Field label="Team">
            <select value={team} onChange={(e) => setTeam(e.target.value as SupportTeam | '')} className="ip">
              <option value="">— Any —</option>
              {TEAMS.map((t) => <option key={t} value={t}>{SUPPORT_TEAM_LABEL[t]}</option>)}
            </select>
          </Field>
          <Field label="First response (min)"><input type="number" min={1} value={fr} onChange={(e) => setFr(Number(e.target.value))} className="ip" /></Field>
          <Field label="Resolution (min)"><input type="number" min={1} value={rs} onChange={(e) => setRs(Number(e.target.value))} className="ip" /></Field>
        </Grid>
        {err ? <p className="mt-2 text-[12.5px] text-[color:var(--color-terracotta)]">{err}</p> : null}
        <div className="mt-3 flex justify-end">
          <button onClick={create} disabled={busy || name.trim().length < 2} className="btn-primary">{busy ? 'Saving…' : 'Add policy'}</button>
        </div>
      </Card>

      <Card title={`Policies (${items.length})`}>
        {loading ? <p className="text-[13px] text-[color:var(--color-ink-soft)]">Loading…</p> : null}
        {!loading && items.length === 0 ? <p className="text-[13px] text-[color:var(--color-ink-soft)]">No policies yet — defaults apply.</p> : null}
        <ul className="divide-y divide-[color:var(--color-ink)]/8">
          {items.map((p) => (
            <li key={p.id} className="grid grid-cols-[1fr_auto] gap-3 py-3">
              <div>
                <div className="text-[14px] font-medium">{p.name} {!p.active ? <span className="ml-2 text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-terracotta)]">inactive</span> : null}</div>
                <div className="mt-0.5 text-[12px] text-[color:var(--color-ink-soft)]">
                  {p.priority ? TICKET_PRIORITY_LABEL[p.priority] : 'Any priority'}{' · '}
                  {p.team ? SUPPORT_TEAM_LABEL[p.team] : 'Any team'}{' · '}
                  FR {p.firstResponseMinutes}m · resolve {p.resolveMinutes}m
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(p)} className="text-[11.5px] text-[color:var(--color-ink-soft)] hover:underline">{p.active ? 'Deactivate' : 'Activate'}</button>
                <button onClick={() => destroy(p)} className="text-[11.5px] text-[color:var(--color-terracotta)] hover:underline">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ─── Routing ────────────────────────────────────────────────────────────────

interface RoutingRule {
  id: string; name: string; priority: number; active: boolean;
  match: { category?: TicketCategory; channel?: TicketChannel; hasOrder?: boolean; keywordsAny?: string[] };
  action: { team?: SupportTeam; agentId?: string; strategy?: 'ROUND_ROBIN' | 'LEAST_BUSY' };
}

function RoutingPanel() {
  const [items, setItems] = useState<RoutingRule[]>([]);
  const [name, setName] = useState('');
  const [pr, setPr] = useState(100);
  const [matchCat, setMatchCat] = useState<TicketCategory | ''>('');
  const [matchChan, setMatchChan] = useState<TicketChannel | ''>('');
  const [matchHasOrder, setMatchHasOrder] = useState<'any' | 'yes' | 'no'>('any');
  const [keywords, setKeywords] = useState('');
  const [actTeam, setActTeam] = useState<SupportTeam | ''>('');
  const [actStrategy, setActStrategy] = useState<'NONE' | 'ROUND_ROBIN' | 'LEAST_BUSY'>('NONE');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/admin/support/routing-rules', { cache: 'no-store' });
    const body = await res.json();
    if (body.ok) setItems(body.rules);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setBusy(true); setErr(null);
    const match: Record<string, unknown> = {};
    if (matchCat)  match.category = matchCat;
    if (matchChan) match.channel  = matchChan;
    if (matchHasOrder !== 'any') match.hasOrder = matchHasOrder === 'yes';
    const kws = keywords.split(',').map((k) => k.trim()).filter(Boolean);
    if (kws.length) match.keywordsAny = kws;
    const action: Record<string, unknown> = {};
    if (actTeam) action.team = actTeam;
    if (actStrategy !== 'NONE') action.strategy = actStrategy;

    const res = await fetch('/api/admin/support/routing-rules', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, priority: pr, match, action }),
    });
    const body = await res.json();
    if (!body.ok) { setErr(body.error ?? 'Could not create'); setBusy(false); return; }
    setName(''); setPr(100); setMatchCat(''); setMatchChan(''); setMatchHasOrder('any');
    setKeywords(''); setActTeam(''); setActStrategy('NONE');
    setBusy(false); load();
  }

  async function toggle(r: RoutingRule) {
    await fetch(`/api/admin/support/routing-rules/${r.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ active: !r.active }),
    });
    load();
  }

  async function destroy(r: RoutingRule) {
    if (!confirm(`Delete "${r.name}"?`)) return;
    await fetch(`/api/admin/support/routing-rules/${r.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-6">
      <Card title="New rule" intro="Lowest priority number wins. First match assigns the ticket.">
        <Grid>
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className="ip" /></Field>
          <Field label="Priority"><input type="number" value={pr} onChange={(e) => setPr(Number(e.target.value))} className="ip" /></Field>
          <Field label="Match · Category">
            <select value={matchCat} onChange={(e) => setMatchCat(e.target.value as TicketCategory | '')} className="ip">
              <option value="">— Any —</option>
              {CATS.map((c) => <option key={c} value={c}>{TICKET_CATEGORY_LABEL[c]}</option>)}
            </select>
          </Field>
          <Field label="Match · Channel">
            <select value={matchChan} onChange={(e) => setMatchChan(e.target.value as TicketChannel | '')} className="ip">
              <option value="">— Any —</option>
              {CHANS.map((c) => <option key={c} value={c}>{TICKET_CHANNEL_LABEL[c]}</option>)}
            </select>
          </Field>
          <Field label="Match · Has order?">
            <select value={matchHasOrder} onChange={(e) => setMatchHasOrder(e.target.value as 'any' | 'yes' | 'no')} className="ip">
              <option value="any">Any</option><option value="yes">Yes</option><option value="no">No</option>
            </select>
          </Field>
          <Field label="Match · Keywords (any)" wide><input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="comma, separated" className="ip" /></Field>
          <Field label="Action · Team">
            <select value={actTeam} onChange={(e) => setActTeam(e.target.value as SupportTeam | '')} className="ip">
              <option value="">— Inferred from category —</option>
              {TEAMS.map((t) => <option key={t} value={t}>{SUPPORT_TEAM_LABEL[t]}</option>)}
            </select>
          </Field>
          <Field label="Action · Pick agent by">
            <select value={actStrategy} onChange={(e) => setActStrategy(e.target.value as 'NONE' | 'ROUND_ROBIN' | 'LEAST_BUSY')} className="ip">
              <option value="NONE">— Leave on team queue —</option>
              <option value="ROUND_ROBIN">Round-robin</option>
              <option value="LEAST_BUSY">Least busy</option>
            </select>
          </Field>
        </Grid>
        {err ? <p className="mt-2 text-[12.5px] text-[color:var(--color-terracotta)]">{err}</p> : null}
        <div className="mt-3 flex justify-end">
          <button onClick={create} disabled={busy || name.trim().length < 2} className="btn-primary">{busy ? 'Saving…' : 'Add rule'}</button>
        </div>
      </Card>

      <Card title={`Rules (${items.length})`}>
        <ul className="divide-y divide-[color:var(--color-ink)]/8">
          {items.map((r) => {
            const ms: string[] = [];
            if (r.match.category) ms.push(`category=${TICKET_CATEGORY_LABEL[r.match.category]}`);
            if (r.match.channel)  ms.push(`channel=${TICKET_CHANNEL_LABEL[r.match.channel]}`);
            if (r.match.hasOrder !== undefined) ms.push(`hasOrder=${r.match.hasOrder}`);
            if (r.match.keywordsAny?.length) ms.push(`keywords:[${r.match.keywordsAny.join(', ')}]`);
            const ac: string[] = [];
            if (r.action.team) ac.push(`team=${SUPPORT_TEAM_LABEL[r.action.team]}`);
            if (r.action.strategy) ac.push(`pick=${r.action.strategy.toLowerCase().replace('_', ' ')}`);
            if (r.action.agentId) ac.push(`agent=${r.action.agentId}`);
            return (
              <li key={r.id} className="grid grid-cols-[1fr_auto] gap-3 py-3">
                <div>
                  <div className="text-[14px] font-medium">{r.name} <span className="ml-1.5 text-[10.5px] text-[color:var(--color-ink-soft)]">priority {r.priority}</span> {!r.active ? <span className="ml-2 text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-terracotta)]">inactive</span> : null}</div>
                  <div className="mt-0.5 text-[12px] text-[color:var(--color-ink-soft)]">when {ms.length ? ms.join(' & ') : 'anything'} → {ac.length ? ac.join(' · ') : 'team queue'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggle(r)} className="text-[11.5px] text-[color:var(--color-ink-soft)] hover:underline">{r.active ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={() => destroy(r)} className="text-[11.5px] text-[color:var(--color-terracotta)] hover:underline">Delete</button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

// ─── Escalation ─────────────────────────────────────────────────────────────

interface EscalationRule {
  id: string; name: string; trigger: EscalationTrigger; thresholdMinutes: number;
  bumpToPriority: TicketPriority | null; reassignToTeam: SupportTeam | null;
  active: boolean;
}

function EscalationPanel() {
  const [items, setItems] = useState<EscalationRule[]>([]);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<EscalationTrigger>('FIRST_RESPONSE_OVERDUE');
  const [threshold, setThreshold] = useState(0);
  const [bump, setBump] = useState<TicketPriority | ''>('');
  const [team, setTeam] = useState<SupportTeam | ''>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/admin/support/escalation-rules', { cache: 'no-store' });
    const body = await res.json();
    if (body.ok) setItems(body.rules);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setBusy(true); setErr(null);
    const res = await fetch('/api/admin/support/escalation-rules', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, trigger, thresholdMinutes: threshold, bumpToPriority: bump || null, reassignToTeam: team || null }),
    });
    const body = await res.json();
    if (!body.ok) { setErr(body.error ?? 'Could not create'); setBusy(false); return; }
    setName(''); setThreshold(0); setBump(''); setTeam('');
    setBusy(false); load();
  }

  async function toggle(r: EscalationRule) {
    await fetch(`/api/admin/support/escalation-rules/${r.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ active: !r.active }),
    });
    load();
  }

  async function destroy(r: EscalationRule) {
    if (!confirm(`Deactivate "${r.name}"?`)) return;
    await fetch(`/api/admin/support/escalation-rules/${r.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-6">
      <Card title="New rule" intro="Bumps priority and/or reassigns when a trigger fires. Threshold is grace minutes past the breach.">
        <Grid>
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className="ip" /></Field>
          <Field label="Trigger">
            <select value={trigger} onChange={(e) => setTrigger(e.target.value as EscalationTrigger)} className="ip">
              {TRIGGERS.map((t) => <option key={t} value={t}>{t.toLowerCase().replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
          <Field label="Threshold (min)"><input type="number" min={0} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="ip" /></Field>
          <Field label="Bump priority to">
            <select value={bump} onChange={(e) => setBump(e.target.value as TicketPriority | '')} className="ip">
              <option value="">— Don't change —</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{TICKET_PRIORITY_LABEL[p]}</option>)}
            </select>
          </Field>
          <Field label="Reassign to team">
            <select value={team} onChange={(e) => setTeam(e.target.value as SupportTeam | '')} className="ip">
              <option value="">— Don't change —</option>
              {TEAMS.map((t) => <option key={t} value={t}>{SUPPORT_TEAM_LABEL[t]}</option>)}
            </select>
          </Field>
        </Grid>
        {err ? <p className="mt-2 text-[12.5px] text-[color:var(--color-terracotta)]">{err}</p> : null}
        <div className="mt-3 flex justify-end">
          <button onClick={create} disabled={busy || name.trim().length < 2} className="btn-primary">{busy ? 'Saving…' : 'Add rule'}</button>
        </div>
      </Card>

      <Card title={`Rules (${items.length})`}>
        <ul className="divide-y divide-[color:var(--color-ink)]/8">
          {items.map((r) => (
            <li key={r.id} className="grid grid-cols-[1fr_auto] gap-3 py-3">
              <div>
                <div className="text-[14px] font-medium">{r.name} {!r.active ? <span className="ml-2 text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-terracotta)]">inactive</span> : null}</div>
                <div className="mt-0.5 text-[12px] text-[color:var(--color-ink-soft)]">
                  {r.trigger.toLowerCase().replace(/_/g, ' ')} (+{r.thresholdMinutes}m) →
                  {r.bumpToPriority ? ` bump to ${TICKET_PRIORITY_LABEL[r.bumpToPriority]}` : ''}
                  {r.bumpToPriority && r.reassignToTeam ? ' &' : ''}
                  {r.reassignToTeam ? ` reassign ${SUPPORT_TEAM_LABEL[r.reassignToTeam]}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggle(r)} className="text-[11.5px] text-[color:var(--color-ink-soft)] hover:underline">{r.active ? 'Deactivate' : 'Activate'}</button>
                <button onClick={() => destroy(r)} className="text-[11.5px] text-[color:var(--color-terracotta)] hover:underline">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ─── Agents ─────────────────────────────────────────────────────────────────

interface Agent {
  id: string; name: string; phone: string; email: string | null;
  teams: SupportTeam[]; active: boolean;
  _count: { assignedTickets: number };
}

function AgentsPanel() {
  const [items, setItems] = useState<Agent[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [teams, setTeams] = useState<SupportTeam[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/admin/support/agents', { cache: 'no-store' });
    const body = await res.json();
    if (body.ok) setItems(body.agents);
  }
  useEffect(() => { load(); }, []);

  function toggleTeam(t: SupportTeam) {
    setTeams((cur) => cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]);
  }

  async function create() {
    setBusy(true); setErr(null);
    const res = await fetch('/api/admin/support/agents', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, phone, email: email || null, teams }),
    });
    const body = await res.json();
    if (!body.ok) { setErr(body.error ?? 'Could not create'); setBusy(false); return; }
    setName(''); setPhone(''); setEmail(''); setTeams([]);
    setBusy(false); load();
  }

  async function toggleActive(a: Agent) {
    await fetch(`/api/admin/support/agents/${a.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ active: !a.active }),
    });
    load();
  }

  async function setAgentTeams(a: Agent, next: SupportTeam[]) {
    await fetch(`/api/admin/support/agents/${a.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ teams: next }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <Card title="New agent" intro="Empty teams = generalist (eligible for every queue).">
        <Grid>
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className="ip" /></Field>
          <Field label="Phone (10-digit)"><input value={phone} onChange={(e) => setPhone(e.target.value)} className="ip" /></Field>
          <Field label="Email (optional)"><input value={email} onChange={(e) => setEmail(e.target.value)} className="ip" /></Field>
          <Field label="Teams" wide>
            <div className="flex flex-wrap gap-1.5">
              {TEAMS.map((t) => (
                <button
                  key={t} type="button"
                  onClick={() => toggleTeam(t)}
                  className={`px-2.5 py-1 rounded-full text-[11.5px] border ${
                    teams.includes(t)
                      ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] border-transparent'
                      : 'bg-[color:var(--color-paper)] text-[color:var(--color-ink-soft)] border-[color:var(--color-ink)]/14'
                  }`}
                >{SUPPORT_TEAM_LABEL[t]}</button>
              ))}
            </div>
          </Field>
        </Grid>
        {err ? <p className="mt-2 text-[12.5px] text-[color:var(--color-terracotta)]">{err}</p> : null}
        <div className="mt-3 flex justify-end">
          <button onClick={create} disabled={busy || name.trim().length < 2 || phone.replace(/\D/g, '').length !== 10} className="btn-primary">{busy ? 'Saving…' : 'Add agent'}</button>
        </div>
      </Card>

      <Card title={`Agents (${items.length})`}>
        <ul className="divide-y divide-[color:var(--color-ink)]/8">
          {items.map((a) => (
            <li key={a.id} className="grid grid-cols-[1fr_auto] gap-3 py-3">
              <div>
                <div className="text-[14px] font-medium">
                  {a.name} {!a.active ? <span className="ml-2 text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-terracotta)]">inactive</span> : null}
                </div>
                <div className="mt-0.5 text-[12px] text-[color:var(--color-ink-soft)]">
                  +91 {a.phone}{a.email ? ` · ${a.email}` : ''}{' · '}
                  {a._count.assignedTickets} open
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TEAMS.map((t) => {
                    const on = a.teams.includes(t);
                    return (
                      <button
                        key={t}
                        onClick={() => setAgentTeams(a, on ? a.teams.filter((x) => x !== t) : [...a.teams, t])}
                        className={`px-2 py-0.5 rounded-full text-[10.5px] border transition-colors ${
                          on
                            ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] border-transparent'
                            : 'bg-[color:var(--color-paper)] text-[color:var(--color-ink-soft)] border-[color:var(--color-ink)]/14'
                        }`}
                      >{SUPPORT_TEAM_LABEL[t]}</button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(a)} className="text-[11.5px] text-[color:var(--color-ink-soft)] hover:underline">{a.active ? 'Deactivate' : 'Activate'}</button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ─── shared bits ────────────────────────────────────────────────────────────

function Card({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-5">
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)] mb-1">{title}</div>
      {intro ? <p className="text-[12px] text-[color:var(--color-ink-soft)] mb-3">{intro}</p> : null}
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)] mb-1">{label}</div>
      {children}
      <style jsx>{`
        :global(.ip) {
          width: 100%;
          background: var(--color-cream);
          border: 1px solid color-mix(in srgb, var(--color-ink) 14%, transparent);
          border-radius: 12px;
          padding: 0.45rem 0.7rem;
          font-size: 13px;
          outline: none;
        }
        :global(.btn-primary) {
          padding: 0.625rem 1.25rem;
          border-radius: 9999px;
          background: var(--color-forest);
          color: var(--color-cream);
          font-size: 12.5px;
          font-weight: 500;
          transition: background 0.15s;
        }
        :global(.btn-primary:disabled) { opacity: 0.5; }
        :global(.btn-primary:hover:not(:disabled)) { background: var(--color-forest-dark); }
      `}</style>
    </div>
  );
}
