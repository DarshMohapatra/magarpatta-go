'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MAGARPATTA_SOCIETIES, getBuildings } from '@/lib/societies';
import { cn } from '@/lib/utils';

type Step = 'society' | 'building' | null;

export function TowerSelect() {
  const [step, setStep] = useState<Step>(null);
  const [query, setQuery] = useState('');
  const [society, setSociety] = useState<string | null>(null);
  const [building, setBuilding] = useState<string | null>(null);
  const [flat, setFlat] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setStep(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const filteredSocieties = useMemo(
    () =>
      MAGARPATTA_SOCIETIES.filter((s) =>
        s.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

  const availableBuildings = useMemo(
    () => (society ? getBuildings(society).filter((b) => b.toLowerCase().includes(query.toLowerCase())) : []),
    [society, query],
  );

  if (confirmed && society && building) {
    return (
      <div className="w-full max-w-xl rounded-2xl border border-[color:var(--color-forest)]/20 bg-[color:var(--color-paper)] p-6 shadow-[0_12px_40px_-12px_rgba(27,59,47,0.22)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-serif text-2xl leading-tight text-[color:var(--color-forest-dark)]">
              Brilliant — we deliver to{' '}
              <span className="italic">
                {building}
                {flat ? `, Flat ${flat}` : ''}, {society}
              </span>.
            </p>
            <p className="mt-2 text-[14px] text-[color:var(--color-ink-soft)]">
              Join the waitlist and we&apos;ll ping you the moment our 4 riders go live in your building.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="#waitlist"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)]"
              >
                Join waitlist
              </a>
              <button
                onClick={() => {
                  setConfirmed(false);
                  setSociety(null);
                  setBuilding(null);
                  setFlat('');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-ink)]/5"
              >
                Change address
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="w-full max-w-xl rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-2 shadow-[0_12px_40px_-18px_rgba(15,15,14,0.22)]"
    >
      <div className="flex flex-col sm:flex-row items-stretch gap-2">
        {/* Society */}
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => {
              setStep(step === 'society' ? null : 'society');
              setQuery('');
            }}
            className="w-full text-left px-4 py-3 rounded-xl hover:bg-[color:var(--color-cream)] transition-colors flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/70">
                Society
              </div>
              <div
                className={cn(
                  'mt-0.5 truncate text-[14px]',
                  society ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-ink-soft)]/60',
                )}
              >
                {society ?? 'Select'}
              </div>
            </div>
            <svg
              width="12"
              height="12"
              viewBox="0 0 14 14"
              fill="none"
              className={cn('shrink-0 transition-transform', step === 'society' && 'rotate-180')}
            >
              <path d="M3.5 5.5L7 9l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {step === 'society' && (
            <Dropdown
              query={query}
              setQuery={setQuery}
              items={filteredSocieties.map((s) => ({ key: s.name, label: s.name, sub: `${s.buildings.length} buildings` }))}
              selected={society}
              onSelect={(v) => {
                setSociety(v);
                setBuilding(null);
                setStep('building');
                setQuery('');
              }}
              placeholder="Search Magarpatta societies…"
              empty="No society matches. Are you inside Magarpatta?"
            />
          )}
        </div>

        {/* Building */}
        <div className="relative flex-1">
          <button
            type="button"
            disabled={!society}
            onClick={() => {
              if (!society) return;
              setStep(step === 'building' ? null : 'building');
              setQuery('');
            }}
            className={cn(
              'w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center justify-between gap-3',
              society ? 'hover:bg-[color:var(--color-cream)]' : 'opacity-50 cursor-not-allowed',
            )}
          >
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/70">
                Building
              </div>
              <div
                className={cn(
                  'mt-0.5 truncate text-[14px]',
                  building ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-ink-soft)]/60',
                )}
              >
                {building ?? (society ? 'Select' : '—')}
              </div>
            </div>
            <svg
              width="12"
              height="12"
              viewBox="0 0 14 14"
              fill="none"
              className={cn('shrink-0 transition-transform', step === 'building' && 'rotate-180')}
            >
              <path d="M3.5 5.5L7 9l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {step === 'building' && society && (
            <Dropdown
              query={query}
              setQuery={setQuery}
              items={availableBuildings.map((b) => ({ key: b, label: b }))}
              selected={building}
              onSelect={(v) => {
                setBuilding(v);
                setStep(null);
                setQuery('');
              }}
              placeholder={`Search ${society} buildings…`}
              empty="No building matches."
            />
          )}
        </div>

        {/* Flat */}
        <div className="flex items-stretch gap-2">
          <div className="flex flex-col justify-center px-3 rounded-xl hover:bg-[color:var(--color-cream)] transition-colors">
            <label className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/70">
              Flat
            </label>
            <input
              value={flat}
              onChange={(e) => setFlat(e.target.value)}
              placeholder="302"
              className="mt-0.5 w-16 text-[14px] bg-transparent outline-none placeholder:text-[color:var(--color-ink-soft)]/40"
            />
          </div>
          <button
            type="button"
            disabled={!society || !building}
            onClick={() => setConfirmed(true)}
            className={cn(
              'shrink-0 px-5 rounded-xl text-[13px] font-medium transition-all flex items-center gap-1.5',
              society && building
                ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)]'
                : 'bg-[color:var(--color-ink)]/5 text-[color:var(--color-ink-soft)]/50 cursor-not-allowed',
            )}
          >
            Check
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function Dropdown({
  query,
  setQuery,
  items,
  selected,
  onSelect,
  placeholder,
  empty,
}: {
  query: string;
  setQuery: (v: string) => void;
  items: Array<{ key: string; label: string; sub?: string }>;
  selected: string | null;
  onSelect: (v: string) => void;
  placeholder: string;
  empty: string;
}) {
  return (
    <div className="absolute left-0 right-0 top-full mt-2 z-20 rounded-xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] shadow-[0_24px_60px_-20px_rgba(15,15,14,0.28)] overflow-hidden">
      <div className="p-2 border-b border-[color:var(--color-ink)]/8">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-[14px] bg-transparent outline-none placeholder:text-[color:var(--color-ink-soft)]/50"
        />
      </div>
      <ul className="max-h-64 overflow-y-auto py-1">
        {items.length === 0 && (
          <li className="px-4 py-3 text-[13px] text-[color:var(--color-ink-soft)]/70">{empty}</li>
        )}
        {items.map((it) => (
          <li key={it.key}>
            <button
              type="button"
              onClick={() => onSelect(it.key)}
              className={cn(
                'w-full text-left px-4 py-2.5 text-[14px] hover:bg-[color:var(--color-cream)] flex items-center justify-between gap-3',
                selected === it.key && 'bg-[color:var(--color-forest)]/5 text-[color:var(--color-forest)]',
              )}
            >
              <span className="truncate">{it.label}</span>
              {it.sub && (
                <span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/60">
                  {it.sub}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
