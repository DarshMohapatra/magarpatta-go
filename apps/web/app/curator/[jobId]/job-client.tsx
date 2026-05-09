'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Item {
  name: string;
  mrpInr: number;
  priceInr: number;
  isVeg: boolean;
  isRegulated: boolean;
  unit: string | null;
  description: string | null;
}

interface JobMeta {
  id: string;
  status: 'PENDING_CURATOR' | 'CURATED' | 'REJECTED';
  source: string;
  categorySlug: string;
  submittedAt: string;
  curatorNote: string | null;
  curatedAt: string | null;
  vendor: { id: string; name: string; slug: string; hub: string };
  imageIndices: number[];
}

interface Category { slug: string; name: string }

const inp = 'w-full rounded-md border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-2 py-1 text-[13px] outline-none focus:border-[color:var(--color-forest)]';

export function CuratorJobClient({ job, initialItems, categories }: {
  job: JobMeta;
  initialItems: Item[];
  categories: Category[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [categorySlug, setCategorySlug] = useState(job.categorySlug);
  const [note, setNote] = useState('');
  const [activeImg, setActiveImg] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const readOnly = job.status !== 'PENDING_CURATOR';

  function update(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, j) => j === i ? { ...it, ...patch } : it));
  }
  function remove(i: number) {
    setItems((prev) => prev.filter((_, j) => j !== i));
  }
  function addRow() {
    setItems((prev) => [...prev, { name: '', mrpInr: 0, priceInr: 0, isVeg: true, isRegulated: false, unit: null, description: null }]);
  }

  async function approve() {
    if (!items.length) { setErr('No items to approve.'); return; }
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/curator/jobs/${job.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorySlug,
          // priceInr is omitted on purpose — the API derives it from MRP
          // (mrp+1 for non-regulated, mrp for regulated). Curator only sets MRP.
          items: items.map((it) => ({
            name: it.name.trim(),
            mrpInr: Number(it.mrpInr) || 0,
            isVeg: it.isVeg,
            isRegulated: it.isRegulated,
            unit: it.unit?.trim() || null,
            description: it.description?.trim() || null,
          })),
        }),
      });
      const j = await r.json();
      if (!j.ok) { setErr(j.error ?? 'Approve failed'); return; }
      router.push('/curator');
      router.refresh();
    } finally { setBusy(false); }
  }

  async function reject() {
    if (!note.trim()) { setErr('Add a reason in the note before rejecting.'); return; }
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/curator/jobs/${job.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() }),
      });
      const j = await r.json();
      if (!j.ok) { setErr(j.error ?? 'Reject failed'); return; }
      router.push('/curator');
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div>
      <Link href="/curator" className="text-[12.5px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)]">← Queue</Link>

      <div className="mt-3 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">{job.source} import · {job.status.toLowerCase().replace('_', ' ')}</div>
          <h1 className="mt-1 font-serif text-[30px] sm:text-[36px] leading-[1.05] tracking-[-0.02em]">{job.vendor.name}</h1>
          <p className="text-[12.5px] text-[color:var(--color-ink-soft)]">{job.vendor.hub} · submitted {new Date(job.submittedAt).toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-6 items-start">
        {/* Image viewer */}
        <div className="lg:sticky lg:top-[120px] space-y-3">
          {job.imageIndices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--color-ink)]/15 p-10 text-center text-[12.5px] text-[color:var(--color-ink-soft)]/70">
              No image attached (source was {job.source}).
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/curator/jobs/${job.id}/image/${activeImg}`}
                alt="Original menu photo"
                className="w-full rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)]"
              />
              {job.imageIndices.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {job.imageIndices.map((i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`shrink-0 rounded-lg overflow-hidden border-2 ${activeImg === i ? 'border-[color:var(--color-forest)]' : 'border-transparent hover:border-[color:var(--color-ink)]/20'}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/curator/jobs/${job.id}/image/${i}`}
                        alt={`Photo ${i + 1}`}
                        className="h-16 w-16 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Item editor */}
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <label className="block">
              <span className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Category</span>
              <select disabled={readOnly} value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} className={inp + ' mt-1'}>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </label>
            <span className="text-[12px] text-[color:var(--color-ink-soft)]">{items.length} item{items.length === 1 ? '' : 's'}</span>
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/65">
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2 w-20">MRP ₹</th>
                  <th className="px-2 py-2 w-24">Unit</th>
                  <th className="px-2 py-2 w-12">Veg</th>
                  <th className="px-2 py-2 w-14">MRP-locked</th>
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-ink)]/8 align-top">
                {items.map((it, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1.5">
                      <input disabled={readOnly} value={it.name} onChange={(e) => update(i, { name: e.target.value })} className={inp} />
                    </td>
                    <td className="px-2 py-1.5">
                      <input disabled={readOnly} type="number" min={0} value={it.mrpInr} onChange={(e) => update(i, { mrpInr: Number(e.target.value) || 0 })} className={inp} />
                    </td>
                    <td className="px-2 py-1.5">
                      <input disabled={readOnly} value={it.unit ?? ''} onChange={(e) => update(i, { unit: e.target.value })} placeholder="e.g. half" className={inp} />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input disabled={readOnly} type="checkbox" checked={it.isVeg} onChange={(e) => update(i, { isVeg: e.target.checked })} className="accent-[color:var(--color-forest)]" />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input disabled={readOnly} type="checkbox" checked={it.isRegulated} onChange={(e) => update(i, { isRegulated: e.target.checked })} className="accent-[color:var(--color-forest)]" />
                    </td>
                    <td className="px-2 py-1.5">
                      {!readOnly && (
                        <button onClick={() => remove(i)} title="Remove row" className="text-[color:var(--color-terracotta)] text-[14px]">×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11.5px] text-[color:var(--color-ink-soft)]/75">
            Customer pays MRP on the menu. The platform adds a hidden ₹1 convenience fee at checkout (only on non-MRP-locked items) — you don&apos;t need to set it. Tick &ldquo;MRP-locked&rdquo; for packaged regulated goods (Legal Metrology rule: sells at MRP only).
          </p>

          {!readOnly && (
            <button onClick={addRow} className="text-[12.5px] text-[color:var(--color-forest)] hover:underline">+ Add a missing item</button>
          )}

          {!readOnly && (
            <>
              <label className="block pt-2">
                <span className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Note (sent to vendor on reject)</span>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={inp + ' mt-1'} />
              </label>

              {err && <p className="text-[12.5px] text-[color:var(--color-terracotta)]">{err}</p>}

              <div className="flex flex-wrap gap-2 pt-1">
                <button disabled={busy} onClick={approve} className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-2.5 text-[13.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50">
                  {busy ? 'Forwarding…' : `Approve · forward ${items.length} to admin`}
                </button>
                <button disabled={busy} onClick={reject} className="rounded-full border border-[color:var(--color-terracotta)]/40 text-[color:var(--color-terracotta)] px-5 py-2.5 text-[13px] hover:bg-[color:var(--color-terracotta)]/8 disabled:opacity-50">
                  Reject
                </button>
              </div>
            </>
          )}

          {readOnly && job.curatorNote && (
            <div className="rounded-xl bg-[color:var(--color-terracotta)]/8 border border-[color:var(--color-terracotta)]/20 px-4 py-3 text-[12.5px]">
              <span className="text-[color:var(--color-ink-soft)]/70">Curator note:</span> {job.curatorNote}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
