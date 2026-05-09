'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/lib/site-config';

type Label = 'HOME' | 'WORK' | 'OTHER';

interface Address {
  id: string;
  label: Label;
  society: string;
  building: string;
  flat: string;
  verified: boolean;
  isDefault: boolean;
}

interface SocietyMeta {
  name: string;
  buildings: { name: string; floors: number; flatsPerFloor: number }[];
}

interface Props {
  initial: Address[];
  societies: SocietyMeta[];
  returnTo: string | null;
}

const LABEL_CHIP: Record<Label, string> = {
  HOME: 'Home',
  WORK: 'Work',
  OTHER: 'Other',
};

const inp =
  'w-full rounded-lg border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-3 py-2.5 text-[14px] outline-none focus:border-[color:var(--color-forest)] placeholder:text-[color:var(--color-ink-soft)]/50';

export function AddressesClient({ initial, societies, returnTo }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Address[]>(initial);
  const [adding, setAdding] = useState(initial.length === 0);
  const [busy, setBusy] = useState<string | null>(null);

  async function handleSetDefault(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/users/addresses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setAsDefault: true }),
      });
      const data = await res.json();
      if (data.ok) setItems(data.addresses);
    } finally {
      setBusy(null);
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this address?')) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/users/addresses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) setItems(data.addresses);
    } finally {
      setBusy(null);
      router.refresh();
    }
  }

  return (
    <section className="pt-24 pb-20">
      <div className="mx-auto max-w-[860px] px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Saved addresses</div>
            <h1 className="mt-2 font-serif text-[36px] sm:text-[44px] leading-[1.02] tracking-[-0.02em]">
              Where to drop off, <span className="italic text-[color:var(--color-forest)]">your call.</span>
            </h1>
          </div>
          {returnTo && (
            <Link href={returnTo} className="text-[13px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)]">
              ← Back to checkout
            </Link>
          )}
        </div>

        {items.length > 0 && (
          <ul className="mt-8 space-y-3">
            {items.map((a) => (
              <li
                key={a.id}
                className={cn(
                  'rounded-2xl border p-4 sm:p-5 bg-[color:var(--color-paper)] flex items-start justify-between gap-4 flex-wrap',
                  a.isDefault
                    ? 'border-[color:var(--color-forest)] bg-[color:var(--color-forest)]/5'
                    : 'border-[color:var(--color-ink)]/10',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full bg-[color:var(--color-ink)]/8 px-2.5 py-0.5 text-[10.5px] uppercase tracking-[0.14em] font-medium text-[color:var(--color-ink-soft)]">
                      {LABEL_CHIP[a.label]}
                    </span>
                    {a.isDefault && (
                      <span className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-2.5 py-0.5 text-[10.5px] uppercase tracking-[0.14em] font-medium">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-[15px] font-medium text-[color:var(--color-ink)]">
                    Flat {a.flat}, {a.building}
                  </div>
                  <div className="text-[13.5px] text-[color:var(--color-ink-soft)]">{a.society}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {!a.isDefault && (
                    <button
                      disabled={busy === a.id}
                      onClick={() => handleSetDefault(a.id)}
                      className="text-[12.5px] text-[color:var(--color-forest)] hover:underline disabled:opacity-50"
                    >
                      Set as default
                    </button>
                  )}
                  <button
                    disabled={busy === a.id}
                    onClick={() => handleDelete(a.id)}
                    className="text-[12.5px] text-[color:var(--color-terracotta)] hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8">
          {adding ? (
            <AddAddressForm
              societies={societies}
              hasExisting={items.length > 0}
              onCancel={() => setAdding(false)}
              onAdded={(addrs) => {
                setItems(addrs);
                setAdding(false);
                router.refresh();
                if (returnTo) router.push(returnTo);
              }}
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="rounded-full border border-[color:var(--color-forest)]/30 px-5 py-2.5 text-[13.5px] text-[color:var(--color-forest)] hover:bg-[color:var(--color-forest)]/8"
            >
              + Add another address
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function AddAddressForm({
  societies,
  hasExisting,
  onAdded,
  onCancel,
}: {
  societies: SocietyMeta[];
  hasExisting: boolean;
  onAdded: (addrs: Address[]) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState<Label>('HOME');
  const [mode, setMode] = useState<'directory' | 'office'>('directory');
  const [society, setSociety] = useState('');
  const [building, setBuilding] = useState('');
  const [flat, setFlat] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(!hasExisting);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const buildings = useMemo(() => {
    if (mode !== 'directory') return [];
    return societies.find((s) => s.name === society)?.buildings ?? [];
  }, [mode, society, societies]);

  async function submit() {
    if (!society.trim() || !building.trim() || !flat.trim()) {
      setErr('Society, building and flat are required.');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch('/api/users/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, society: society.trim(), building: building.trim(), flat: flat.trim(), setAsDefault }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error ?? 'Could not save');
        setSubmitting(false);
        return;
      }
      onAdded(data.addresses as Address[]);
    } catch {
      setErr('Network error. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-semibold">Add a new address</div>
        {hasExisting && (
          <button onClick={onCancel} className="text-[12px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]">
            Cancel
          </button>
        )}
      </div>

      {/* Label radio */}
      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75 mb-2">Label</div>
        <div className="flex gap-2 flex-wrap">
          {(['HOME', 'WORK', 'OTHER'] as Label[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLabel(l)}
              className={cn(
                'px-4 py-1.5 rounded-full text-[12.5px] border transition-colors',
                label === l
                  ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] border-[color:var(--color-forest)]'
                  : 'border-[color:var(--color-ink)]/15 hover:border-[color:var(--color-forest)]/40',
              )}
            >
              {LABEL_CHIP[l]}
            </button>
          ))}
        </div>
      </div>

      {/* Directory vs office mode */}
      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75 mb-2">Address type</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setMode('directory'); setSociety(''); setBuilding(''); }}
            className={cn(
              'rounded-xl border p-3 text-left transition-colors',
              mode === 'directory'
                ? 'border-[color:var(--color-forest)] bg-[color:var(--color-forest)]/5'
                : 'border-[color:var(--color-ink)]/12 hover:border-[color:var(--color-forest)]/40',
            )}
          >
            <div className="text-[13px] font-medium">{siteConfig.siteName} society</div>
            <div className="mt-0.5 text-[11.5px] text-[color:var(--color-ink-soft)]">Pick from the directory</div>
          </button>
          <button
            type="button"
            onClick={() => { setMode('office'); setSociety(''); setBuilding(''); }}
            className={cn(
              'rounded-xl border p-3 text-left transition-colors',
              mode === 'office'
                ? 'border-[color:var(--color-forest)] bg-[color:var(--color-forest)]/5'
                : 'border-[color:var(--color-ink)]/12 hover:border-[color:var(--color-forest)]/40',
            )}
          >
            <div className="text-[13px] font-medium">Office tower / other</div>
            <div className="mt-0.5 text-[11.5px] text-[color:var(--color-ink-soft)]">Type the building name</div>
          </button>
        </div>
      </div>

      {/* Society + building */}
      {mode === 'directory' ? (
        <>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Society</span>
            <select
              value={society}
              onChange={(e) => { setSociety(e.target.value); setBuilding(''); }}
              className={cn(inp, 'mt-1.5')}
            >
              <option value="">Select society…</option>
              {societies.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Building</span>
            <select
              disabled={!society}
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className={cn(inp, 'mt-1.5 disabled:opacity-50')}
            >
              <option value="">{society ? 'Select building…' : 'Pick a society first'}</option>
              {buildings.map((b) => (
                <option key={b.name} value={b.name}>{b.name}</option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Cluster / area</span>
            <input
              value={society}
              onChange={(e) => setSociety(e.target.value)}
              placeholder="e.g. Cybercity, World Trade Center"
              className={cn(inp, 'mt-1.5')}
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Tower / building name</span>
            <input
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              placeholder="e.g. Tower 4, Trade Tower"
              className={cn(inp, 'mt-1.5')}
            />
          </label>
        </>
      )}

      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">
          {mode === 'office' ? 'Floor / unit' : 'Flat number'}
        </span>
        <input
          value={flat}
          onChange={(e) => setFlat(e.target.value)}
          placeholder={mode === 'office' ? 'e.g. 7th floor, desk 12' : 'e.g. 1104'}
          className={cn(inp, 'mt-1.5')}
        />
      </label>

      {hasExisting && (
        <label className="inline-flex items-center gap-2 cursor-pointer text-[13px]">
          <input
            type="checkbox"
            checked={setAsDefault}
            onChange={(e) => setSetAsDefault(e.target.checked)}
            className="accent-[color:var(--color-forest)]"
          />
          Set as default address
        </label>
      )}

      {err && <p className="text-[12.5px] text-[color:var(--color-terracotta)]">{err}</p>}

      <div className="flex gap-2 pt-1">
        <button
          disabled={submitting}
          onClick={submit}
          className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-2.5 text-[13.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save address'}
        </button>
        {hasExisting && (
          <button onClick={onCancel} className="rounded-full border border-[color:var(--color-ink)]/15 px-5 py-2.5 text-[13.5px] hover:bg-[color:var(--color-ink)]/5">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
