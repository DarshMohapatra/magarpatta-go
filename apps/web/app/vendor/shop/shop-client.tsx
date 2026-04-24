'use client';

import { useEffect, useState } from 'react';

interface ShopData {
  id: string;
  slug: string;
  name: string;
  hub: string;
  description: string | null;
  vendorType: string;
  active: boolean;
  approvalStatus: string;
  approvalNote: string | null;
  etaMinutes: number;
  costForTwo: number | null;
  tags: string[];
  ownerName: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
  gstin: string | null;
  fssaiNumber: string | null;
  drugLicense: string | null;
  panNumber: string | null;
  addressLine: string | null;
  openTime: string | null;
  closeTime: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankAccountName: string | null;
  upiId: string | null;
  commissionPct: number;
  supportsSelfDelivery: boolean;
  selfDeliveryFeeInr: number | null;
  selfDeliveryAvailable: boolean;
  onPlatform: boolean;
}

export function VendorShopClient() {
  const [shop, setShop] = useState<ShopData | null>(null);
  const [form, setForm] = useState<Partial<ShopData>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const r = await fetch('/api/vendor/shop', { cache: 'no-store' });
    const j = await r.json();
    if (j.ok) { setShop(j.vendor); setForm(j.vendor); }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch('/api/vendor/shop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (j.ok) { setMsg('Saved ✓'); load(); } else { setMsg(j.error ?? 'Save failed'); }
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 2500);
    }
  }

  async function togglePause() {
    await fetch('/api/vendor/shop', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !shop?.active }),
    });
    load();
  }

  if (!shop) return <div className="text-[13px] text-[color:var(--color-ink-soft)]">Loading…</div>;

  const pending = shop.approvalStatus !== 'APPROVED';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Shop details</div>
          <h1 className="mt-2 font-serif text-[32px] sm:text-[40px] leading-[1.02] tracking-[-0.02em]">{shop.name}</h1>
          <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-soft)]">
            Slug <code className="text-[color:var(--color-ink)]">{shop.slug}</code> · Commission {shop.commissionPct}%
          </p>
        </div>
        {!pending && (
          <button
            onClick={togglePause}
            className={`rounded-full px-5 py-2.5 text-[13px] font-medium ${
              shop.active
                ? 'border border-[color:var(--color-terracotta)]/40 text-[color:var(--color-terracotta)] hover:bg-[color:var(--color-terracotta)]/8'
                : 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)]'
            }`}
          >
            {shop.active ? 'Pause shop' : 'Go live'}
          </button>
        )}
      </div>

      {pending && (
        <div className="rounded-2xl border border-[color:var(--color-saffron)]/30 bg-[color:var(--color-saffron)]/8 px-5 py-4 text-[13px]">
          Status · <span className="font-medium uppercase tracking-[0.12em]">{shop.approvalStatus}</span>
          {shop.approvalNote && <p className="mt-1 text-[color:var(--color-ink-soft)]/80">Note: {shop.approvalNote}</p>}
        </div>
      )}

      <Card title="Storefront">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Description (shown to customers)">
            <textarea rows={3} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inp} />
          </Field>
          <Field label="Hub / location">
            <input value={form.hub ?? ''} onChange={(e) => setForm({ ...form, hub: e.target.value })} className={inp} />
          </Field>
          <Field label="Full address">
            <input value={form.addressLine ?? ''} onChange={(e) => setForm({ ...form, addressLine: e.target.value })} className={inp} />
          </Field>
          <Field label="Vendor type">
            <select value={form.vendorType ?? 'restaurant'} onChange={(e) => setForm({ ...form, vendorType: e.target.value })} className={inp}>
              {['restaurant', 'cafe', 'bakery', 'sweets', 'grocery', 'meat', 'pharmacy'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Prep ETA (minutes)">
            <input type="number" min={5} max={60} value={form.etaMinutes ?? 25} onChange={(e) => setForm({ ...form, etaMinutes: Number(e.target.value) })} className={inp} />
          </Field>
          <Field label="Cost for two (₹, restaurants only)">
            <input type="number" value={form.costForTwo ?? ''} onChange={(e) => setForm({ ...form, costForTwo: e.target.value ? Number(e.target.value) : null })} className={inp} />
          </Field>
          <Field label="Opens at">
            <input type="time" value={form.openTime ?? ''} onChange={(e) => setForm({ ...form, openTime: e.target.value })} className={inp} />
          </Field>
          <Field label="Closes at">
            <input type="time" value={form.closeTime ?? ''} onChange={(e) => setForm({ ...form, closeTime: e.target.value })} className={inp} />
          </Field>
        </div>
      </Card>

      <Card title="Owner & KYC">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Owner name"><input value={form.ownerName ?? ''} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} className={inp} /></Field>
          <Field label="Owner email"><input type="email" value={form.ownerEmail ?? ''} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} className={inp} /></Field>
          <Field label="Phone (locked — used as login)"><input value={form.ownerPhone ?? ''} readOnly className={`${inp} opacity-60`} /></Field>
          <Field label="PAN"><input value={form.panNumber ?? ''} onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })} className={inp} /></Field>
          <Field label="GSTIN"><input value={form.gstin ?? ''} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} className={inp} /></Field>
          <Field label="FSSAI number"><input value={form.fssaiNumber ?? ''} onChange={(e) => setForm({ ...form, fssaiNumber: e.target.value })} className={inp} /></Field>
          <Field label="Drug licence (pharmacy)"><input value={form.drugLicense ?? ''} onChange={(e) => setForm({ ...form, drugLicense: e.target.value })} className={inp} /></Field>
        </div>
      </Card>

      <Card title="Fulfilment">
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(form.supportsSelfDelivery)}
              onChange={(e) => setForm({ ...form, supportsSelfDelivery: e.target.checked })}
              className="mt-1 h-4 w-4 accent-[color:var(--color-forest)]"
            />
            <span>
              <span className="text-[13.5px] font-medium">I deliver my own orders</span>
              <p className="text-[12px] text-[color:var(--color-ink-soft)]/80 mt-0.5">
                If on, your staff picks up + delivers within Magarpatta. No platform rider is involved and customers
                see you on the tracker directly. If off, a Magarpatta Go rider collects from your counter.
              </p>
            </span>
          </label>
          {form.supportsSelfDelivery && (
            <>
              <Field label="Self-delivery fee (₹ — optional; leave blank to use platform default)">
                <input
                  type="number"
                  value={form.selfDeliveryFeeInr ?? ''}
                  onChange={(e) => setForm({ ...form, selfDeliveryFeeInr: e.target.value ? Number(e.target.value) : null })}
                  className={inp}
                  placeholder="e.g. 20"
                />
              </Field>
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-[color:var(--color-saffron)]/30 bg-[color:var(--color-saffron)]/5 p-3">
                <input
                  type="checkbox"
                  checked={form.selfDeliveryAvailable ?? true}
                  onChange={(e) => setForm({ ...form, selfDeliveryAvailable: e.target.checked })}
                  className="mt-0.5 h-4 w-4 accent-[color:var(--color-forest)]"
                />
                <span>
                  <span className="text-[13px] font-medium">My delivery team is available right now</span>
                  <p className="text-[11.5px] text-[color:var(--color-ink-soft)]/80 mt-0.5">
                    Keep this on when your drivers can take new orders. Flip it off if they&apos;re all busy —
                    new orders will automatically route to a Magarpatta Go rider instead. Flip it back on when
                    you have capacity again.
                  </p>
                </span>
              </label>
            </>
          )}
        </div>
      </Card>

      <Card title="Payout details">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Account holder"><input value={form.bankAccountName ?? ''} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} className={inp} /></Field>
          <Field label="Account number"><input value={form.bankAccountNumber ?? ''} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value.replace(/\D/g, '') })} className={inp} /></Field>
          <Field label="IFSC"><input value={form.bankIfsc ?? ''} onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })} className={inp} /></Field>
          <Field label="UPI ID"><input value={form.upiId ?? ''} onChange={(e) => setForm({ ...form, upiId: e.target.value })} className={inp} /></Field>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {msg && <span className="text-[12.5px] text-[color:var(--color-forest)]">{msg}</span>}
        <button disabled={saving} onClick={save} className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-6 py-2.5 text-[13.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

const inp = 'mt-1 w-full rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-3 py-2 text-[13.5px] outline-none focus:border-[color:var(--color-forest)]';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6">
      <h2 className="font-serif text-[18px] mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">{label}</span>
      {children}
    </label>
  );
}
