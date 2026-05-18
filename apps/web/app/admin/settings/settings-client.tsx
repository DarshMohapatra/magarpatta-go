'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SlotDefinition, CustomerNotice } from '@/lib/settings';

interface Props {
  initialDeliveryFeeInr: number;
  initialSlots: SlotDefinition[];
  initialWholesaleOnly: boolean;
  initialNotice: CustomerNotice;
  canEdit: boolean;
}

function minutesToHHMM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function cutoffSummary(slot: SlotDefinition): string {
  const cutoff = slot.cutoffMinutesBefore ?? 0;
  if (cutoff <= 0) return 'No cutoff — bookable until slot start';
  const cutoffAtMin = slot.startMin - cutoff;
  // 12-hour formatting for the rendered time
  const formatTime = (totalMins: number) => {
    const m = ((totalMins % 1440) + 1440) % 1440;
    const h24 = Math.floor(m / 60);
    const mm = m % 60;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = ((h24 % 12) || 12);
    return mm === 0 ? `${h12} ${ampm}` : `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
  };
  if (cutoffAtMin < 0) {
    const t = formatTime(cutoffAtMin); // wraps via mod 1440
    return `Orders close at ${t} the day before`;
  }
  return `Orders close at ${formatTime(cutoffAtMin)} the same day`;
}

function hhmmToMinutes(value: string): number | null {
  const m = /^([0-9]{1,2}):([0-9]{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 24 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function SettingsClient({ initialDeliveryFeeInr, initialSlots, initialWholesaleOnly, initialNotice, canEdit }: Props) {
  const router = useRouter();
  const [deliveryFee, setDeliveryFee] = useState(String(initialDeliveryFeeInr));
  const [slots, setSlots] = useState<SlotDefinition[]>(initialSlots);
  const [wholesaleOnly, setWholesaleOnly] = useState<boolean>(initialWholesaleOnly);
  const [notice, setNotice] = useState<CustomerNotice>(initialNotice);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  function addSlot() {
    const id = `slot-${Date.now().toString(36)}`;
    setSlots((prev) => [
      ...prev,
      { id, label: '', startMin: 540, endMin: 660, capacity: 20, cutoffMinutesBefore: 0 },
    ]);
  }

  function updateSlot(idx: number, patch: Partial<SlotDefinition>) {
    setSlots((prev) => prev.map((s, i) => {
      if (i !== idx) return s;
      const next = { ...s, ...patch };
      // Auto-derive id from label if id is still the default machine id and label is set.
      if (patch.label !== undefined && next.id.startsWith('slot-') && next.label) {
        next.id = slugify(next.label) || next.id;
      }
      return next;
    }));
  }

  function removeSlot(idx: number) {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    setError(null);
    setSavedNote(null);

    const feeNum = Number(deliveryFee);
    if (!Number.isInteger(feeNum) || feeNum < 0 || feeNum > 500) {
      setError('Delivery fee must be a whole rupee value between 0 and 500.');
      return;
    }

    for (const s of slots) {
      if (!s.label.trim()) { setError('Every slot needs a label.'); return; }
      if (s.endMin <= s.startMin) { setError(`Slot "${s.label}" ends before it starts.`); return; }
      if (s.capacity < 0) { setError(`Slot "${s.label}" capacity can't be negative.`); return; }
    }
    const ids = slots.map((s) => s.id);
    if (new Set(ids).size !== ids.length) {
      setError('Two slots share the same id. Edit a label so they differ.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_fee_inr: feeNum,
          slot_definitions: slots,
          wholesale_only_mode: wholesaleOnly,
          customer_notice: notice,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Save failed');
        return;
      }
      setSavedNote('Saved. Changes are live.');
      router.refresh();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-10 space-y-10">
      {/* Delivery fee */}
      <section className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6">
        <h2 className="font-serif text-[22px]">Delivery fee</h2>
        <p className="mt-1 text-[13px] text-[color:var(--color-ink-soft)]">
          What a non-member pays per delivery. Members on an active plan don't see this fee.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-[20px] font-medium">₹</span>
          <input
            type="number"
            value={deliveryFee}
            onChange={(e) => setDeliveryFee(e.target.value)}
            disabled={!canEdit}
            min={0}
            max={500}
            className="w-32 rounded-lg border border-[color:var(--color-ink)]/15 px-3 py-2 text-[16px] focus:border-[color:var(--color-forest)] outline-none disabled:opacity-60"
          />
          <span className="text-[12px] text-[color:var(--color-ink-soft)]">per delivery</span>
        </div>
      </section>

      {/* Delivery slots */}
      <section className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-[22px]">Delivery slots</h2>
            <p className="mt-1 text-[13px] text-[color:var(--color-ink-soft)]">
              Customers pick one of these at checkout, or choose "Order now".
              Capacity is a soft cap — overbooking is permitted.
            </p>
          </div>
          {canEdit && (
            <button
              onClick={addSlot}
              className="rounded-lg bg-[color:var(--color-forest)] text-white px-4 py-2 text-[13px] hover:opacity-90"
            >
              + Add slot
            </button>
          )}
        </div>

        {slots.length === 0 ? (
          <p className="mt-6 text-[13px] text-[color:var(--color-ink-soft)] italic">
            No slots yet — customers will only see "Order now" at checkout.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {slots.map((slot, idx) => (
              <div
                key={slot.id}
                className="rounded-lg border border-[color:var(--color-ink)]/10 px-3 py-3 space-y-2"
              >
                <div className="grid grid-cols-12 items-center gap-3">
                  <input
                    type="text"
                    value={slot.label}
                    onChange={(e) => updateSlot(idx, { label: e.target.value })}
                    disabled={!canEdit}
                    placeholder="e.g. 9 AM – 11 AM"
                    className="col-span-4 rounded border border-[color:var(--color-ink)]/15 px-2 py-1.5 text-[14px] outline-none focus:border-[color:var(--color-forest)] disabled:opacity-60"
                  />
                  <div className="col-span-2 flex items-center gap-1">
                    <span className="text-[11px] text-[color:var(--color-ink-soft)]">from</span>
                    <input
                      type="time"
                      value={minutesToHHMM(slot.startMin)}
                      onChange={(e) => {
                        const mins = hhmmToMinutes(e.target.value);
                        if (mins !== null) updateSlot(idx, { startMin: mins });
                      }}
                      disabled={!canEdit}
                      className="rounded border border-[color:var(--color-ink)]/15 px-1.5 py-1 text-[13px] outline-none focus:border-[color:var(--color-forest)] disabled:opacity-60"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    <span className="text-[11px] text-[color:var(--color-ink-soft)]">to</span>
                    <input
                      type="time"
                      value={minutesToHHMM(slot.endMin)}
                      onChange={(e) => {
                        const mins = hhmmToMinutes(e.target.value);
                        if (mins !== null) updateSlot(idx, { endMin: mins });
                      }}
                      disabled={!canEdit}
                      className="rounded border border-[color:var(--color-ink)]/15 px-1.5 py-1 text-[13px] outline-none focus:border-[color:var(--color-forest)] disabled:opacity-60"
                    />
                  </div>
                  <div className="col-span-3 flex items-center gap-1">
                    <span className="text-[11px] text-[color:var(--color-ink-soft)]">cap</span>
                    <input
                      type="number"
                      value={slot.capacity}
                      min={0}
                      onChange={(e) => updateSlot(idx, { capacity: Math.max(0, Number(e.target.value) || 0) })}
                      disabled={!canEdit}
                      className="w-20 rounded border border-[color:var(--color-ink)]/15 px-2 py-1 text-[13px] outline-none focus:border-[color:var(--color-forest)] disabled:opacity-60"
                    />
                    <span className="text-[11px] text-[color:var(--color-ink-soft)]">orders</span>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => removeSlot(idx)}
                      className="col-span-1 text-[12px] text-[color:var(--color-terracotta)] hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 pl-1 text-[12px] text-[color:var(--color-ink-soft)] flex-wrap">
                  <span>Cutoff</span>
                  <input
                    type="number"
                    value={slot.cutoffMinutesBefore ?? 0}
                    min={0}
                    onChange={(e) => updateSlot(idx, { cutoffMinutesBefore: Math.max(0, Number(e.target.value) || 0) })}
                    disabled={!canEdit}
                    className="w-24 rounded border border-[color:var(--color-ink)]/15 px-2 py-1 text-[12.5px] outline-none focus:border-[color:var(--color-forest)] disabled:opacity-60"
                  />
                  <span>minutes before slot start</span>
                  <span className="ml-auto rounded-full bg-[color:var(--color-forest)]/8 px-2 py-0.5 text-[11px] text-[color:var(--color-forest)] font-medium">
                    {cutoffSummary(slot)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Wholesale-only mode */}
      <section className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-[22px]">Wholesale-only mode</h2>
            <p className="mt-1 text-[13px] text-[color:var(--color-ink-soft)] max-w-[560px]">
              While on, the public catalog only shows products from vendors
              flagged as wholesale. Use this to soft-launch with a curated
              subset of suppliers. Flip off when retail vendors go live.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={wholesaleOnly}
              onChange={(e) => setWholesaleOnly(e.target.checked)}
              disabled={!canEdit}
              className="h-4 w-4"
            />
            <span className="text-[13px] font-medium">{wholesaleOnly ? 'On' : 'Off'}</span>
          </label>
        </div>
      </section>

      {/* Customer broadcast notice */}
      <section className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6">
        <h2 className="font-serif text-[22px]">Customer banner</h2>
        <p className="mt-1 text-[13px] text-[color:var(--color-ink-soft)] max-w-[560px]">
          A short notice shown across customer pages. Use it for slot changes
          ("9–11 AM extended to 10 AM today"), holiday hours, or weather delays.
          Toggle off to hide without deleting the text.
        </p>
        <div className="mt-4 space-y-3">
          <textarea
            value={notice.message}
            onChange={(e) => setNotice({ ...notice, message: e.target.value.slice(0, 280) })}
            disabled={!canEdit}
            rows={2}
            maxLength={280}
            placeholder="e.g. Tomorrow's 9–11 AM slot starts 30 minutes early — please order by 5:30 PM today."
            className="w-full rounded-md border border-[color:var(--color-ink)]/15 px-3 py-2 text-[13.5px] outline-none focus:border-[color:var(--color-forest)] disabled:opacity-60"
          />
          <div className="flex flex-wrap items-center gap-4 text-[13px]">
            <label className="inline-flex items-center gap-2">
              Level
              <select
                value={notice.level}
                onChange={(e) => setNotice({ ...notice, level: e.target.value as 'info' | 'warning' | 'alert' })}
                disabled={!canEdit}
                className="rounded-md border border-[color:var(--color-ink)]/15 px-2 py-1 text-[13px] outline-none focus:border-[color:var(--color-forest)]"
              >
                <option value="info">Info (green)</option>
                <option value="warning">Warning (saffron)</option>
                <option value="alert">Alert (terracotta)</option>
              </select>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notice.active}
                onChange={(e) => setNotice({ ...notice, active: e.target.checked })}
                disabled={!canEdit}
                className="h-4 w-4"
              />
              <span className="font-medium">{notice.active ? 'Showing to customers' : 'Hidden'}</span>
            </label>
            <span className="text-[11px] text-[color:var(--color-ink-soft)]">{notice.message.length}/280 characters</span>
          </div>
          {notice.message && (
            <div className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]">Preview</div>
          )}
          {notice.message && (
            <div className={
              'rounded-lg px-4 py-2.5 text-[13px] ' +
              (notice.level === 'alert' ? 'bg-[color:var(--color-terracotta)]/10 border border-[color:var(--color-terracotta)]/30 text-[color:var(--color-terracotta-dark)]'
                : notice.level === 'warning' ? 'bg-[color:var(--color-saffron)]/10 border border-[color:var(--color-saffron)]/30'
                : 'bg-[color:var(--color-forest)]/8 border border-[color:var(--color-forest)]/30 text-[color:var(--color-forest)]')
            }>
              {notice.message}
            </div>
          )}
        </div>
      </section>

      {/* WhatsApp test — only useful once Twilio env vars are wired. */}
      {canEdit && <WhatsAppTestButton />}

      {/* One-shot launch seed — only meaningful on a fresh prod DB. */}
      {canEdit && (
        <SeedDefaultsButton />
      )}

      {/* Save bar */}
      <div className="sticky bottom-4 flex items-center justify-end gap-4 rounded-xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] px-4 py-3 shadow-sm">
        {error && <span className="text-[13px] text-[color:var(--color-terracotta)]">{error}</span>}
        {savedNote && !error && <span className="text-[13px] text-[color:var(--color-forest)]">{savedNote}</span>}
        <button
          onClick={save}
          disabled={!canEdit || saving}
          className="rounded-lg bg-[color:var(--color-forest)] text-white px-5 py-2 text-[14px] disabled:opacity-50 hover:opacity-90"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function WhatsAppTestButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/whatsapp-test', { method: 'POST' });
      const data = await res.json();
      if (!data.ok) {
        setResult({ ok: false, message: data.error ?? 'Failed' });
        return;
      }
      setResult({ ok: true, message: `Test message queued to ${data.sentTo}. Check your WhatsApp.` });
    } catch {
      setResult({ ok: false, message: 'Network error' });
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[color:var(--color-forest)]/25 bg-[color:var(--color-forest)]/5 p-6">
      <h2 className="font-serif text-[20px]">WhatsApp sandbox test</h2>
      <p className="mt-1 text-[13px] text-[color:var(--color-ink-soft)]">
        Sends a sample order summary to <code>WHATSAPP_TEST_RECIPIENT</code>.
        Requires the four Twilio env vars set on Vercel — without them the
        button returns a 503 listing what's missing.
      </p>
      <button
        onClick={run}
        disabled={running}
        className="mt-3 rounded-md bg-[color:var(--color-forest)] text-white px-4 py-2 text-[13px] font-medium disabled:opacity-50 hover:opacity-90"
      >
        {running ? 'Sending…' : 'Send test WhatsApp'}
      </button>
      {result && (
        <p className={`mt-2 text-[12.5px] ${result.ok ? 'text-[color:var(--color-forest)]' : 'text-[color:var(--color-terracotta)]'}`}>
          {result.message}
        </p>
      )}
    </section>
  );
}

function SeedDefaultsButton() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<Record<string, string> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setErr(null);
    setReport(null);
    try {
      const res = await fetch('/api/admin/seed-defaults', { method: 'POST' });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error ?? 'Failed');
        return;
      }
      setReport(data.report);
    } catch {
      setErr('Network error');
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[color:var(--color-saffron)]/30 bg-[color:var(--color-saffron)]/5 p-6">
      <h2 className="font-serif text-[20px]">One-shot launch seed</h2>
      <p className="mt-1 text-[13px] text-[color:var(--color-ink-soft)]">
        Inserts the Saver 30 plan, top-up SKUs, and the default morning/evening slots — only if they're missing. Safe to run more than once.
      </p>
      <button
        onClick={run}
        disabled={running}
        className="mt-3 rounded-md bg-[color:var(--color-saffron)] text-[color:var(--color-ink)] px-4 py-2 text-[13px] font-medium disabled:opacity-50 hover:opacity-90"
      >
        {running ? 'Seeding…' : 'Seed launch defaults'}
      </button>
      {err && <p className="mt-2 text-[12px] text-[color:var(--color-terracotta)]">{err}</p>}
      {report && (
        <ul className="mt-3 text-[12px] text-[color:var(--color-ink-soft)] space-y-1 list-disc pl-5">
          {Object.entries(report).map(([k, v]) => (
            <li key={k}><strong>{k}:</strong> {v}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
