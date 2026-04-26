'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CAMPAIGN_TYPE_LABELS } from '@/lib/campaign-types';

interface Campaign {
  id: string;
  type: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  productIds: string[];
  discountPct: number | null;
  startsAt: string;
  endsAt: string;
  vendor: { id: string; slug: string; name: string; hub: string };
}

const STORAGE_KEY = 'mg_campaign_dismissed';

function readDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch { return new Set(); }
}

function writeDismissed(set: Set<string>) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

export function CampaignBanner() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [toastShown, setToastShown] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed());
    fetch('/api/campaigns', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { if (j.ok) setCampaigns(j.campaigns); })
      .catch(() => { /* ignore */ });
  }, []);

  const visible = campaigns.filter((c) => !dismissed.has(c.id));

  useEffect(() => {
    if (visible.length <= 1) return;
    const t = setInterval(() => {
      setActiveIdx((i) => (i + 1) % visible.length);
    }, 5500);
    return () => clearInterval(t);
  }, [visible.length]);

  // One-shot toast for time-urgent campaigns (FLASH_SALE / LATE_NIGHT) on first visit per session.
  const urgent = visible.find((c) => c.type === 'FLASH_SALE' || c.type === 'LATE_NIGHT');
  useEffect(() => {
    if (toastShown || !urgent) return;
    const seenKey = `mg_toast_${urgent.id}`;
    if (sessionStorage.getItem(seenKey)) return;
    sessionStorage.setItem(seenKey, '1');
    setToastShown(true);
    const t = setTimeout(() => setToastShown(false), 7500);
    return () => clearTimeout(t);
  }, [urgent, toastShown]);

  if (visible.length === 0) return null;

  const current = visible[activeIdx % visible.length];

  function dismiss(id: string) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    writeDismissed(next);
  }

  return (
    <>
      <section className="mx-auto max-w-[1280px] px-6 lg:px-10 mt-2">
        <div className="relative overflow-hidden rounded-3xl border border-[color:var(--color-saffron)]/25 bg-gradient-to-br from-[color:var(--color-saffron)]/10 via-[color:var(--color-paper)] to-[color:var(--color-gold)]/10 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="hidden sm:inline-flex h-10 w-10 shrink-0 rounded-full bg-[color:var(--color-saffron)]/15 items-center justify-center">
              <Spark />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">
                  {CAMPAIGN_TYPE_LABELS[current.type] ?? current.type}
                </span>
                <span className="text-[color:var(--color-ink-soft)]/30">·</span>
                <span className="text-[11.5px] text-[color:var(--color-ink-soft)]">
                  {current.vendor.name} · {current.vendor.hub}
                </span>
                {current.discountPct ? (
                  <span className="ml-1 rounded-full bg-[color:var(--color-terracotta)]/10 text-[color:var(--color-terracotta)] text-[10.5px] uppercase tracking-[0.12em] px-2 py-0.5">
                    {current.discountPct}% off
                  </span>
                ) : null}
                <span className="ml-auto text-[11px] text-[color:var(--color-ink-soft)]/60">
                  Ends {fmtRelative(current.endsAt)}
                </span>
              </div>
              <h3 className="mt-1 font-serif text-[22px] sm:text-[26px] leading-tight tracking-[-0.01em]">
                {current.title}
              </h3>
              <p className="mt-1 text-[13.5px] text-[color:var(--color-ink-soft)] leading-relaxed">
                {current.body}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href={`/restaurants/${current.vendor.slug}`}
                  className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-4 py-2 text-[12.5px] font-medium hover:bg-[color:var(--color-forest-dark)]"
                >
                  {current.ctaLabel || 'Open shop →'}
                </Link>
                <button
                  onClick={() => dismiss(current.id)}
                  className="rounded-full border border-[color:var(--color-ink)]/12 px-3 py-2 text-[12px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]"
                >
                  Hide
                </button>
                {visible.length > 1 && (
                  <div className="ml-auto flex items-center gap-1">
                    {visible.map((_, i) => (
                      <button
                        key={i}
                        aria-label={`Show campaign ${i + 1}`}
                        onClick={() => setActiveIdx(i)}
                        className={`h-1.5 rounded-full transition-all ${i === activeIdx ? 'w-6 bg-[color:var(--color-forest)]' : 'w-1.5 bg-[color:var(--color-ink)]/20'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {toastShown && urgent && (
        <div className="fixed bottom-6 right-6 z-50 max-w-[340px] rounded-2xl bg-[color:var(--color-ink)] text-[color:var(--color-cream)] shadow-2xl px-4 py-3.5 animate-in fade-in slide-in-from-bottom-4">
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">
            {CAMPAIGN_TYPE_LABELS[urgent.type] ?? urgent.type}
          </div>
          <div className="mt-1 font-serif text-[16px] leading-tight">{urgent.title}</div>
          <div className="mt-1 text-[12px] text-[color:var(--color-cream)]/75">{urgent.vendor.name} · ends {fmtRelative(urgent.endsAt)}</div>
          <Link href={`/restaurants/${urgent.vendor.slug}`} className="mt-2 inline-block text-[12px] text-[color:var(--color-saffron)] hover:underline">
            Take me there →
          </Link>
        </div>
      )}
    </>
  );
}

function Spark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 1l1.5 4.5L15 7l-4.5 1.5L9 13l-1.5-4.5L3 7l4.5-1.5L9 1z" fill="currentColor" className="text-[color:var(--color-saffron)]" />
    </svg>
  );
}

function fmtRelative(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const m = Math.round(ms / 60000);
  if (m <= 0) return 'soon';
  if (m < 60) return `in ${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `in ${h}h`;
  const d = Math.round(h / 24);
  return `in ${d}d`;
}
