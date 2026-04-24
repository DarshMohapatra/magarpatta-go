'use client';

import { useEffect, useState } from 'react';

interface Vendor {
  id: string;
  slug: string;
  name: string;
  hub: string;
  vendorType: string;
  approvalStatus: string;
  approvalNote: string | null;
  active: boolean;
  commissionPct: number;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
  addressLine: string | null;
  openTime: string | null;
  closeTime: string | null;
  gstin: string | null;
  fssaiNumber: string | null;
  drugLicense: string | null;
  panNumber: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  upiId: string | null;
  supportsSelfDelivery: boolean;
  selfDeliveryFeeInr: number | null;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  _count: { products: number; orders: number };
}

const TABS: Array<{ key: string; label: string }> = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'SUSPENDED', label: 'Suspended' },
  { key: 'REJECTED', label: 'Rejected' },
];

export function AdminVendorsClient({ initialStatus }: { initialStatus: string }) {
  const [tab, setTab] = useState<string>(TABS.find((t) => t.key === initialStatus)?.key ?? 'PENDING');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  async function load() {
    const r = await fetch(`/api/admin/vendors?status=${tab}`, { cache: 'no-store' });
    const j = await r.json();
    if (j.ok) {
      setVendors(j.vendors);
      const c: Record<string, number> = {};
      for (const row of j.counts) c[row.approvalStatus] = row._count;
      setCounts(c);
    }
  }

  useEffect(() => { load(); setSelected(null); setNote(''); }, [tab]); // eslint-disable-line

  async function act(id: string, endpoint: 'approve' | 'reject' | 'suspend', payload?: Record<string, unknown>) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/vendors/${id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      });
      const j = await r.json();
      if (!j.ok) { alert(j.error ?? 'Action failed'); return; }
      setSelected(null);
      setNote('');
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6">
      <div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Vendors</div>
          <h1 className="mt-2 font-serif text-[32px] sm:text-[40px] leading-[1.02] tracking-[-0.02em]">
            Approvals, <span className="italic text-[color:var(--color-forest)]">end to end.</span>
          </h1>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] border ${
                tab === t.key
                  ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] border-[color:var(--color-forest)]'
                  : 'bg-[color:var(--color-paper)] text-[color:var(--color-ink-soft)] border-[color:var(--color-ink)]/12 hover:text-[color:var(--color-forest)]'
              }`}
            >
              {t.label} <span className="ml-1.5 opacity-70">{counts[t.key] ?? 0}</span>
            </button>
          ))}
        </div>

        <ul className="mt-5 space-y-3">
          {vendors.length === 0 && (
            <li className="rounded-xl border border-dashed border-[color:var(--color-ink)]/15 p-6 text-center text-[13px] text-[color:var(--color-ink-soft)]/70">
              Nothing in this tab.
            </li>
          )}
          {vendors.map((v) => (
            <li key={v.id}>
              <button
                onClick={() => setSelected(v)}
                className={`w-full text-left rounded-2xl border p-4 hover:border-[color:var(--color-forest)]/35 transition-colors ${
                  selected?.id === v.id
                    ? 'border-[color:var(--color-forest)]/45 bg-[color:var(--color-forest)]/5'
                    : 'border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-serif text-[18px] leading-tight truncate">{v.name}</div>
                    <div className="text-[12px] text-[color:var(--color-ink-soft)]/75 truncate">
                      {v.hub} · {v.vendorType}
                      {v.ownerName && <span> · {v.ownerName}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 text-[11px] uppercase tracking-[0.12em]">
                    <span className={
                      v.approvalStatus === 'APPROVED' ? 'text-[color:var(--color-forest)]' :
                      v.approvalStatus === 'PENDING' ? 'text-[color:var(--color-saffron)]' :
                      'text-[color:var(--color-terracotta)]'
                    }>
                      {v.approvalStatus.toLowerCase()}
                    </span>
                    <div className="mt-1 text-[10.5px] text-[color:var(--color-ink-soft)]/60">
                      {v._count.products} items · {v._count.orders} orders
                    </div>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <aside className="lg:sticky lg:top-[130px] lg:self-start">
        {!selected ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--color-ink)]/15 p-10 text-center text-[13px] text-[color:var(--color-ink-soft)]/70">
            Select a vendor to review KYC and take action.
          </div>
        ) : (
          <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6 space-y-5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">{selected.approvalStatus.toLowerCase()}</div>
              <h2 className="mt-1 font-serif text-[26px] leading-tight">{selected.name}</h2>
              <p className="text-[12.5px] text-[color:var(--color-ink-soft)]">slug · {selected.slug} · commission {selected.commissionPct}%</p>
            </div>

            <KV label="Owner">{selected.ownerName ?? '—'}</KV>
            <KV label="Phone">+91 {selected.ownerPhone ?? '—'}</KV>
            <KV label="Email">{selected.ownerEmail ?? '—'}</KV>
            <KV label="Hub">{selected.hub}</KV>
            <KV label="Address">{selected.addressLine ?? '—'}</KV>
            <KV label="Hours">{selected.openTime && selected.closeTime ? `${selected.openTime}–${selected.closeTime}` : '—'}</KV>

            <div className="pt-3 border-t border-[color:var(--color-ink)]/8 grid grid-cols-2 gap-3 text-[12.5px]">
              <KV label="GSTIN">{selected.gstin ?? '—'}</KV>
              <KV label="FSSAI">{selected.fssaiNumber ?? '—'}</KV>
              <KV label="Drug licence">{selected.drugLicense ?? '—'}</KV>
              <KV label="PAN">{selected.panNumber ?? '—'}</KV>
            </div>

            <div className="pt-3 border-t border-[color:var(--color-ink)]/8 grid grid-cols-2 gap-3 text-[12.5px]">
              <KV label="Account holder">{selected.bankAccountName ?? '—'}</KV>
              <KV label="Account #">{selected.bankAccountNumber ?? '—'}</KV>
              <KV label="IFSC">{selected.bankIfsc ?? '—'}</KV>
              <KV label="UPI">{selected.upiId ?? '—'}</KV>
            </div>

            <div className="pt-3 border-t border-[color:var(--color-ink)]/8">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/65 mb-2">Fulfilment</div>
              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.supportsSelfDelivery}
                  onChange={async (e) => {
                    setBusy(true);
                    try {
                      const r = await fetch(`/api/admin/vendors/${selected.id}/fulfilment`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ supportsSelfDelivery: e.target.checked }),
                      });
                      const j = await r.json();
                      if (j.ok) { setSelected({ ...selected, supportsSelfDelivery: e.target.checked }); load(); }
                    } finally { setBusy(false); }
                  }}
                  className="accent-[color:var(--color-forest)]"
                />
                Supports self-delivery (vendor handles delivery; no platform rider)
              </label>
              {selected.supportsSelfDelivery && selected.selfDeliveryFeeInr != null && (
                <p className="mt-1 text-[11.5px] text-[color:var(--color-ink-soft)]/70">Self-delivery fee · ₹{selected.selfDeliveryFeeInr}</p>
              )}
            </div>

            {selected.approvalNote && (
              <div className="rounded-xl bg-[color:var(--color-terracotta)]/8 border border-[color:var(--color-terracotta)]/20 px-4 py-3 text-[12.5px]">
                <span className="text-[color:var(--color-ink-soft)]/70">Last note:</span> {selected.approvalNote}
              </div>
            )}

            {selected.approvalStatus !== 'APPROVED' && (
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Note (sent to vendor on reject / suspend)</span>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-3 py-2 text-[13.5px] outline-none focus:border-[color:var(--color-forest)]" />
              </label>
            )}

            <div className="pt-2 flex flex-wrap gap-2">
              {selected.approvalStatus !== 'APPROVED' && (
                <button disabled={busy} onClick={() => act(selected.id, 'approve')}
                  className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-4 py-2 text-[12.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50">
                  Approve + activate
                </button>
              )}
              {selected.approvalStatus === 'PENDING' && (
                <button disabled={busy} onClick={() => act(selected.id, 'reject', { note })}
                  className="rounded-full border border-[color:var(--color-terracotta)]/40 text-[color:var(--color-terracotta)] px-4 py-2 text-[12.5px] hover:bg-[color:var(--color-terracotta)]/8 disabled:opacity-50">
                  Reject
                </button>
              )}
              {selected.approvalStatus === 'APPROVED' && (
                <button disabled={busy} onClick={() => act(selected.id, 'suspend', { note })}
                  className="rounded-full border border-[color:var(--color-terracotta)]/40 text-[color:var(--color-terracotta)] px-4 py-2 text-[12.5px] hover:bg-[color:var(--color-terracotta)]/8 disabled:opacity-50">
                  Suspend
                </button>
              )}
              {selected.approvalStatus === 'SUSPENDED' && (
                <button disabled={busy} onClick={() => act(selected.id, 'suspend', { unsuspend: true })}
                  className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-4 py-2 text-[12.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50">
                  Lift suspension
                </button>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/65">{label}</div>
      <div className="text-[13.5px]">{children}</div>
    </div>
  );
}
