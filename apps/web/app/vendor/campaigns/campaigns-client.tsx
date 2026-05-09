'use client';

import { useEffect, useMemo, useState } from 'react';
import { CAMPAIGN_TYPE_LABELS, CAMPAIGN_TYPES } from '@/lib/campaign-types';
import { siteConfig } from '@/lib/site-config';

interface Campaign {
  id: string;
  type: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  appliesToAll: boolean;
  productIds: string[];
  discountPct: number | null;
  discountFlatInr: number | null;
  startsAt: string;
  endsAt: string;
  active: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvalNote: string | null;
  submittedAt: string;
  pendingRemoval?: boolean;
}

interface VendorProduct {
  id: string;
  name: string;
  priceInr: number;
  isRegulated: boolean;
  category: { name: string };
}

const inp = 'mt-1 w-full rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-3 py-2 text-[13.5px] outline-none focus:border-[color:var(--color-forest)]';

function defaultRange() {
  const start = new Date();
  start.setHours(start.getHours() + 1, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return {
    start: start.toISOString().slice(0, 16),
    end: end.toISOString().slice(0, 16),
  };
}

export function VendorCampaignsClient({ approvalStatus }: { approvalStatus: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isApproved = approvalStatus === 'APPROVED';

  async function load() {
    const r = await fetch('/api/vendor/campaigns', { cache: 'no-store' });
    const j = await r.json();
    if (j.ok) setCampaigns(j.campaigns);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(c: Campaign) {
    setEditing(c);
    setShowForm(true);
  }

  async function remove(id: string) {
    if (!confirm('Remove this campaign? Removal goes through admin review — customers stop seeing it immediately, but the row clears once admin approves.')) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/vendor/campaigns/${id}`, { method: 'DELETE' });
      const j = await r.json();
      setMsg(j.queued ? 'Removal submitted for review ✓' : 'Removed ✓');
      setTimeout(() => setMsg(null), 3000);
      load();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Campaigns</div>
          <h1 className="mt-2 font-serif text-[32px] sm:text-[40px] leading-[1.02] tracking-[-0.02em]">
            Tell the <span className="italic text-[color:var(--color-forest)]">neighbourhood.</span>
          </h1>
          <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)]/85 max-w-xl">
            Flash sales, festival specials, late-night deals, BOGO, weekend offers, tiffin starts. Each goes through a quick admin review before showing up on the customer feed.
          </p>
        </div>
        {isApproved && (
          <button onClick={openNew} className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-2.5 text-[13.5px] font-medium hover:bg-[color:var(--color-forest-dark)]">
            New campaign
          </button>
        )}
      </div>

      {!isApproved && (
        <div className="rounded-2xl border border-[color:var(--color-saffron)]/30 bg-[color:var(--color-saffron)]/8 px-5 py-4 text-[13px]">
          You can launch campaigns once your shop is approved by {siteConfig.platformName}.
        </div>
      )}

      {msg && <div className="text-[12.5px] text-[color:var(--color-forest)]">{msg}</div>}

      {showForm && (
        <CampaignForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={(saved) => {
            setShowForm(false);
            setEditing(null);
            setMsg(saved ? 'Submitted for review ✓' : null);
            load();
            setTimeout(() => setMsg(null), 3000);
          }}
        />
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {campaigns.length === 0 && !showForm && (
          <div className="sm:col-span-2 rounded-2xl border border-dashed border-[color:var(--color-ink)]/15 p-10 text-center text-[13px] text-[color:var(--color-ink-soft)]/70">
            No campaigns yet. {isApproved && 'Tap "New campaign" to launch your first one.'}
          </div>
        )}

        {campaigns.map((c) => (
          <article key={c.id} className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">
                  {CAMPAIGN_TYPE_LABELS[c.type] ?? c.type}
                </div>
                <h3 className="mt-1 font-serif text-[20px] leading-tight">{c.title}</h3>
              </div>
              <StatusBadge
                status={c.approvalStatus}
                active={c.active}
                endsAt={c.endsAt}
                pendingRemoval={Boolean(c.pendingRemoval)}
              />
            </div>
            <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)] leading-relaxed">{c.body}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-[color:var(--color-ink-soft)]/75">
              <span>{fmt(c.startsAt)} → {fmt(c.endsAt)}</span>
              {c.discountPct ? <span>{c.discountPct}% off</span> : null}
              {c.productIds.length > 0 && <span>{c.productIds.length} item{c.productIds.length === 1 ? '' : 's'} linked</span>}
            </div>
            {c.approvalNote && c.approvalStatus === 'REJECTED' && (
              <div className="mt-3 rounded-xl bg-[color:var(--color-terracotta)]/8 border border-[color:var(--color-terracotta)]/20 px-3 py-2 text-[12px]">
                <span className="text-[color:var(--color-ink-soft)]/70">Reviewer:</span> {c.approvalNote}
              </div>
            )}
            {c.pendingRemoval && (
              <div className="mt-3 rounded-xl bg-[color:var(--color-saffron)]/10 border border-[color:var(--color-saffron)]/25 px-3 py-2 text-[12px] text-[color:var(--color-ink)]">
                Removal awaiting {siteConfig.platformName} review. The campaign stays live until admin approves.
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
              <button
                onClick={() => openEdit(c)}
                disabled={Boolean(c.pendingRemoval)}
                className="rounded-full border border-[color:var(--color-ink)]/15 px-3 py-1 hover:border-[color:var(--color-forest)]/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >Edit</button>
              <button
                onClick={() => remove(c.id)}
                disabled={busy || Boolean(c.pendingRemoval)}
                className="rounded-full border border-[color:var(--color-terracotta)]/35 text-[color:var(--color-terracotta)] px-3 py-1 hover:bg-[color:var(--color-terracotta)]/8 disabled:opacity-50 disabled:cursor-not-allowed"
              >{c.pendingRemoval ? 'Removal pending' : 'Remove'}</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function CampaignForm({ editing, onClose, onSaved }: {
  editing: Campaign | null;
  onClose: () => void;
  onSaved: (saved: boolean) => void;
}) {
  const initial = useMemo(() => {
    if (editing) {
      const kind: 'pct' | 'flat' = editing.discountFlatInr ? 'flat' : 'pct';
      return {
        type: editing.type,
        title: editing.title,
        body: editing.body,
        ctaLabel: editing.ctaLabel ?? '',
        discountKind: kind,
        discountPct: kind === 'pct' ? (editing.discountPct ?? '') : '',
        discountFlatInr: kind === 'flat' ? (editing.discountFlatInr ?? '') : '',
        startsAt: editing.startsAt.slice(0, 16),
        endsAt: editing.endsAt.slice(0, 16),
        active: editing.active,
        appliesToAll: editing.appliesToAll,
        productIds: editing.productIds,
      };
    }
    const r = defaultRange();
    return {
      type: 'FLASH_SALE',
      title: '', body: '', ctaLabel: '',
      discountKind: 'pct' as 'pct' | 'flat',
      discountPct: '' as number | string,
      discountFlatInr: '' as number | string,
      startsAt: r.start, endsAt: r.end, active: true,
      appliesToAll: true,
      productIds: [] as string[],
    };
  }, [editing]);

  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [products, setProducts] = useState<VendorProduct[] | null>(null);

  // Lazily load the vendor's products only when "selected items" is chosen.
  useEffect(() => {
    if (form.appliesToAll || products !== null) return;
    fetch('/api/vendor/products', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { if (j.ok) setProducts(j.products as VendorProduct[]); })
      .catch(() => setProducts([]));
  }, [form.appliesToAll, products]);

  const SALE_TYPES = new Set(['FLASH_SALE', 'BOGO', 'WEEKEND', 'FESTIVAL', 'EARLY_BIRD', 'LATE_NIGHT']);
  const discountRequired = SALE_TYPES.has(form.type);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const pctVal = form.discountKind === 'pct' && form.discountPct !== '' ? Number(form.discountPct) : 0;
    const flatVal = form.discountKind === 'flat' && form.discountFlatInr !== '' ? Number(form.discountFlatInr) : 0;
    if (discountRequired && pctVal <= 0 && flatVal <= 0) {
      setErr('Set a discount — % off or ₹ off. This is what actually moves prices on the menu.');
      return;
    }
    if (!form.appliesToAll && form.productIds.length === 0) {
      setErr('Pick at least one item, or switch the offer back to "applies to whole menu".');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        type: form.type,
        title: form.title,
        body: form.body,
        ctaLabel: form.ctaLabel,
        discountPct: form.discountKind === 'pct' && pctVal > 0 ? pctVal : null,
        discountFlatInr: form.discountKind === 'flat' && flatVal > 0 ? flatVal : null,
        appliesToAll: form.appliesToAll,
        productIds: form.appliesToAll ? [] : form.productIds,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        active: form.active,
      };
      const r = await fetch(editing ? `/api/vendor/campaigns/${editing.id}` : '/api/vendor/campaigns', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j.ok) { setErr(j.error ?? 'Save failed'); return; }
      onSaved(true);
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-[20px]">{editing ? 'Edit campaign' : 'New campaign'}</h2>
        <button type="button" onClick={onClose} className="text-[12px] text-[color:var(--color-ink-soft)] hover:underline">Cancel</button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Type</span>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inp}>
            {CAMPAIGN_TYPES.map((t) => <option key={t} value={t}>{CAMPAIGN_TYPE_LABELS[t]}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Headline (max 60 chars)</span>
          <input maxLength={60} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inp} placeholder="Mango fest at ₹40 off" />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Body (1–2 lines)</span>
          <textarea rows={2} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className={inp} placeholder="Hand-picked Alphonso & Kesar boxes, only this weekend." />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">CTA label (optional)</span>
          <input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} className={inp} placeholder="Shop the box →" />
        </label>
        <div className="block">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">
            Discount {discountRequired ? '· required for sale campaigns' : '· optional'}
          </span>
          <div className="mt-1 inline-flex rounded-xl border border-[color:var(--color-ink)]/12 overflow-hidden">
            <button
              type="button"
              onClick={() => setForm({ ...form, discountKind: 'pct', discountFlatInr: '' })}
              className={`px-4 py-2 text-[12.5px] ${form.discountKind === 'pct' ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)]' : 'bg-[color:var(--color-paper)] text-[color:var(--color-ink-soft)]'}`}
            >% off</button>
            <button
              type="button"
              onClick={() => setForm({ ...form, discountKind: 'flat', discountPct: '' })}
              className={`px-4 py-2 text-[12.5px] border-l border-[color:var(--color-ink)]/12 ${form.discountKind === 'flat' ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)]' : 'bg-[color:var(--color-paper)] text-[color:var(--color-ink-soft)]'}`}
            >₹ off</button>
          </div>
          {form.discountKind === 'pct' ? (
            <input
              type="number" min={1} max={90}
              required={discountRequired}
              value={form.discountPct}
              onChange={(e) => setForm({ ...form, discountPct: e.target.value })}
              placeholder="e.g. 40"
              className={inp + ' mt-2'}
            />
          ) : (
            <input
              type="number" min={1}
              required={discountRequired}
              value={form.discountFlatInr}
              onChange={(e) => setForm({ ...form, discountFlatInr: e.target.value })}
              placeholder="e.g. 50"
              className={inp + ' mt-2'}
            />
          )}
          <span className="mt-1 block text-[11px] text-[color:var(--color-ink-soft)]/70">
            {form.discountKind === 'pct'
              ? 'A percent is taken off each eligible item’s MRP. Regulated MRP goods are skipped.'
              : 'A flat ₹ amount is taken off each eligible item (price floor: ₹1). Regulated MRP goods are skipped.'}
          </span>
        </div>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Starts</span>
          <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className={inp} />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Ends</span>
          <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className={inp} />
        </label>
      </div>

      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-[color:var(--color-forest)]" />
        Live the moment it&apos;s approved (uncheck to keep paused)
      </label>

      <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-4 space-y-3">
        <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Applies to</div>
        <div className="grid sm:grid-cols-2 gap-2">
          <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${form.appliesToAll ? 'border-[color:var(--color-forest)] bg-[color:var(--color-forest)]/5' : 'border-[color:var(--color-ink)]/12'}`}>
            <input
              type="radio" name="scope" checked={form.appliesToAll}
              onChange={() => setForm({ ...form, appliesToAll: true, productIds: [] })}
              className="mt-1 accent-[color:var(--color-forest)]"
            />
            <span>
              <span className="block text-[13px] font-medium text-[color:var(--color-ink)]">Whole menu</span>
              <span className="block text-[11.5px] text-[color:var(--color-ink-soft)]/75">Every non-regulated item gets the discount.</span>
            </span>
          </label>
          <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${!form.appliesToAll ? 'border-[color:var(--color-forest)] bg-[color:var(--color-forest)]/5' : 'border-[color:var(--color-ink)]/12'}`}>
            <input
              type="radio" name="scope" checked={!form.appliesToAll}
              onChange={() => setForm({ ...form, appliesToAll: false })}
              className="mt-1 accent-[color:var(--color-forest)]"
            />
            <span>
              <span className="block text-[13px] font-medium text-[color:var(--color-ink)]">Selected items only</span>
              <span className="block text-[11.5px] text-[color:var(--color-ink-soft)]/75">Pick specific items below.</span>
            </span>
          </label>
        </div>

        {!form.appliesToAll && (
          <div className="rounded-xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-cream)]/40 p-3">
            {products === null ? (
              <p className="text-[12px] text-[color:var(--color-ink-soft)]">Loading your menu…</p>
            ) : products.length === 0 ? (
              <p className="text-[12px] text-[color:var(--color-ink-soft)]">No menu items yet. Add items to your menu first.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-[color:var(--color-ink)]/8">
                {products.map((p) => {
                  const checked = form.productIds.includes(p.id);
                  const disabled = p.isRegulated;
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 py-2 text-[13px] ${disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...form.productIds, p.id]
                            : form.productIds.filter((id) => id !== p.id);
                          setForm({ ...form, productIds: next });
                        }}
                        className="accent-[color:var(--color-forest)]"
                      />
                      <span className="flex-1 truncate">
                        {p.name}
                        {disabled && <span className="ml-2 text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/65">MRP — can&apos;t discount</span>}
                      </span>
                      <span className="shrink-0 text-[12px] text-[color:var(--color-ink-soft)]">₹{p.priceInr}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <div className="mt-2 flex items-center justify-between text-[11.5px] text-[color:var(--color-ink-soft)]">
              <span>{form.productIds.length} selected</span>
              {products && products.length > 0 && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, productIds: products.filter((p) => !p.isRegulated).map((p) => p.id) })}
                  className="text-[color:var(--color-forest)] hover:underline"
                >Select all eligible</button>
              )}
            </div>
          </div>
        )}
      </div>

      {err && <p className="text-[12.5px] text-[color:var(--color-terracotta)]">{err}</p>}

      <div className="flex flex-wrap gap-2">
        <button disabled={busy} className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-2.5 text-[13.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50">
          {busy ? 'Sending…' : editing ? 'Save + resubmit' : 'Submit for review'}
        </button>
        <span className="text-[11.5px] text-[color:var(--color-ink-soft)]/70 self-center">
          Reviews usually clear within an hour.
        </span>
      </div>
    </form>
  );
}

function StatusBadge({ status, active, endsAt, pendingRemoval }: { status: string; active: boolean; endsAt: string; pendingRemoval?: boolean }) {
  const expired = new Date(endsAt) < new Date();
  if (pendingRemoval) return <Badge tone="saffron">Removal pending</Badge>;
  if (expired) return <Badge tone="muted">Expired</Badge>;
  if (status === 'APPROVED' && active) return <Badge tone="forest">Live</Badge>;
  if (status === 'APPROVED' && !active) return <Badge tone="muted">Paused</Badge>;
  if (status === 'PENDING') return <Badge tone="saffron">Awaiting review</Badge>;
  return <Badge tone="terracotta">Rejected</Badge>;
}

function Badge({ tone, children }: { tone: 'forest' | 'saffron' | 'terracotta' | 'muted'; children: React.ReactNode }) {
  const cls =
    tone === 'forest' ? 'bg-[color:var(--color-forest)]/12 text-[color:var(--color-forest)]' :
    tone === 'saffron' ? 'bg-[color:var(--color-saffron)]/15 text-[color:var(--color-saffron)]' :
    tone === 'terracotta' ? 'bg-[color:var(--color-terracotta)]/12 text-[color:var(--color-terracotta)]' :
    'bg-[color:var(--color-ink)]/8 text-[color:var(--color-ink-soft)]';
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] uppercase tracking-[0.12em] ${cls}`}>{children}</span>;
}

function fmt(s: string): string {
  return new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
