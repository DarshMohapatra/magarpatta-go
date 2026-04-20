'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MAGARPATTA_SOCIETIES,
  getBuildings,
  getBuilding,
  validateFlat,
  type Building,
} from '@/lib/societies';
import { cn } from '@/lib/utils';

type Step = 'society' | 'building' | null;

export function TowerSelect() {
  const [step, setStep] = useState<Step>(null);
  const [query, setQuery] = useState('');
  const [society, setSociety] = useState<string | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
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
    () =>
      society
        ? getBuildings(society).filter((b) =>
            b.name.toLowerCase().includes(query.toLowerCase()),
          )
        : [],
    [society, query],
  );

  const flatValidation = useMemo(
    () => (building && flat ? validateFlat(flat, building) : null),
    [flat, building],
  );

  const canProceed = !!society && !!building && flatValidation?.ok === true;

  if (confirmed && society && building && flatValidation?.ok) {
    return (
      <div className="w-full max-w-xl rounded-2xl border border-[color:var(--color-forest)]/20 bg-[color:var(--color-paper)] p-6 shadow-[0_12px_40px_-12px_rgba(27,59,47,0.22)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2.5 7.5l3 3 6-6.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-serif text-2xl leading-tight text-[color:var(--color-forest-dark)]">
              Brilliant — we deliver to{' '}
              <span className="italic">
                Flat {flat}, {building.name}, {society}
              </span>.
            </p>
            <p className="mt-2 text-[14px] text-[color:var(--color-ink-soft)]">
              Floor {flatValidation.floor}, unit {String(flatValidation.unit).padStart(2, '0')}.
              Join the waitlist and we&apos;ll ping you the moment we go live in your building.
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
    <div className="w-full max-w-2xl">
      <div
        ref={ref}
        className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-2 shadow-[0_12px_40px_-18px_rgba(15,15,14,0.22)]"
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
              <Chevron open={step === 'society'} />
            </button>

            {step === 'society' && (
              <Dropdown
                query={query}
                setQuery={setQuery}
                items={filteredSocieties.map((s) => ({
                  key: s.name,
                  label: s.name,
                  sub: `${s.buildings.length} bldgs`,
                }))}
                selected={society}
                onSelect={(v) => {
                  setSociety(v);
                  setBuilding(null);
                  setFlat('');
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
                  {building?.name ?? (society ? 'Select' : '—')}
                </div>
              </div>
              <Chevron open={step === 'building'} />
            </button>

            {step === 'building' && society && (
              <Dropdown
                query={query}
                setQuery={setQuery}
                items={availableBuildings.map((b) => ({
                  key: b.name,
                  label: b.name,
                  sub: `G+${b.floors - 1} · ${b.flatsPerFloor}/fl`,
                }))}
                selected={building?.name ?? null}
                onSelect={(v) => {
                  const b = getBuilding(society, v);
                  if (b) {
                    setBuilding(b);
                    setFlat('');
                  }
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
            <div
              className={cn(
                'flex flex-col justify-center px-3 rounded-xl transition-colors',
                !building && 'opacity-50',
                building && 'hover:bg-[color:var(--color-cream)]',
              )}
            >
              <label className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/70">
                Flat
              </label>
              <input
                disabled={!building}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={flat}
                onChange={(e) => setFlat(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder={building ? examplePlaceholder(building) : '—'}
                className="mt-0.5 w-20 text-[14px] bg-transparent outline-none placeholder:text-[color:var(--color-ink-soft)]/40 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="button"
              disabled={!canProceed}
              onClick={() => setConfirmed(true)}
              className={cn(
                'shrink-0 px-5 rounded-xl text-[13px] font-medium transition-all flex items-center gap-1.5',
                canProceed
                  ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)]'
                  : 'bg-[color:var(--color-ink)]/5 text-[color:var(--color-ink-soft)]/50 cursor-not-allowed',
              )}
            >
              Check
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Inline validation feedback */}
      {building && flat && flatValidation && !flatValidation.ok && (
        <div className="mt-2 flex items-start gap-2 px-4 py-2.5 rounded-xl border border-[color:var(--color-terracotta)]/25 bg-[color:var(--color-terracotta)]/5 text-[13px]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0 text-[color:var(--color-terracotta)]">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <div className="flex-1">
            <span className="text-[color:var(--color-terracotta)]">{flatValidation.reason}</span>
            {flatValidation.hint && (
              <span className="text-[color:var(--color-ink-soft)]/80"> · {flatValidation.hint}</span>
            )}
          </div>
        </div>
      )}

      {building && flatValidation?.ok && (
        <div className="mt-2 flex items-center gap-2 px-4 py-2 text-[12.5px] text-[color:var(--color-forest)]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Floor {flatValidation.floor}, unit {String(flatValidation.unit).padStart(2, '0')} · looks valid.
        </div>
      )}
    </div>
  );
}

function examplePlaceholder(b: Building): string {
  // Show a representative example flat for the middle of the building.
  const midFloor = Math.max(1, Math.floor(b.floors / 2));
  return `${midFloor}0${Math.min(b.flatsPerFloor, 2)}`;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 14 14"
      fill="none"
      className={cn('shrink-0 transition-transform', open && 'rotate-180')}
    >
      <path d="M3.5 5.5L7 9l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
    <div className="absolute left-0 top-full mt-2 z-20 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] shadow-[0_24px_60px_-20px_rgba(15,15,14,0.28)] overflow-hidden">
      <div className="p-2 border-b border-[color:var(--color-ink)]/8">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-[14px] bg-transparent outline-none placeholder:text-[color:var(--color-ink-soft)]/50"
        />
      </div>
      <ul className="max-h-72 overflow-y-auto py-1">
        {items.length === 0 && (
          <li className="px-4 py-3 text-[13px] text-[color:var(--color-ink-soft)]/70">{empty}</li>
        )}
        {items.map((it) => (
          <li key={it.key}>
            <button
              type="button"
              onClick={() => onSelect(it.key)}
              className={cn(
                'w-full text-left px-4 py-2.5 hover:bg-[color:var(--color-cream)] flex items-center justify-between gap-4',
                selected === it.key && 'bg-[color:var(--color-forest)]/5',
              )}
            >
              <span
                className={cn(
                  'flex-1 min-w-0 truncate text-[14px] font-medium text-[color:var(--color-ink)]',
                  selected === it.key && 'text-[color:var(--color-forest)]',
                )}
              >
                {it.label}
              </span>
              {it.sub && (
                <span className="shrink-0 text-[10.5px] uppercase tracking-[0.1em] text-[color:var(--color-ink-soft)]/60">
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
