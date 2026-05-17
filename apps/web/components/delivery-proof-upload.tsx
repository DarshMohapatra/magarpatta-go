'use client';

import { useCallback, useEffect, useState } from 'react';
import { upload } from '@vercel/blob/client';

interface Proof {
  id: string;
  imageUrl: string;
  uploadedByRole: string;
  uploadedByName: string | null;
  note: string | null;
  createdAt: string;
}

/**
 * Drop-in widget for the vendor and admin order detail pages. Reads existing
 * proofs on mount, lets the actor pick + upload a new image directly to
 * Vercel Blob, then writes a DB row via /api/orders/[id]/proof.
 */
export function DeliveryProofUpload({ orderId, canUpload }: { orderId: string; canUpload: boolean }) {
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/orders/${orderId}/proof`);
      const j = await r.json();
      if (j.ok) setProofs(j.proofs);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  async function pickAndUpload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const blob = await upload(`delivery-proof/${orderId}/${file.name}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload/delivery-proof',
      });
      const r = await fetch(`/api/orders/${orderId}/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: blob.url, note: note.trim() || undefined }),
      });
      const j = await r.json();
      if (!j.ok) {
        setError(j.error ?? 'Could not attach proof');
        return;
      }
      setNote('');
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-5">
      <h3 className="font-serif text-[18px]">Delivery proof</h3>
      <p className="mt-1 text-[12px] text-[color:var(--color-ink-soft)]">
        Photo of the basket leaving the shop. Customers see this on their order page.
      </p>

      {loading ? (
        <p className="mt-4 text-[12px] text-[color:var(--color-ink-soft)]">Loading…</p>
      ) : proofs.length === 0 ? (
        <p className="mt-4 text-[12.5px] text-[color:var(--color-ink-soft)] italic">No image uploaded yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {proofs.map((p) => (
            <a key={p.id} href={p.imageUrl} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-[color:var(--color-ink)]/8 hover:opacity-90">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl} alt="Delivery proof" className="w-full aspect-square object-cover" loading="lazy" />
              <div className="px-2 py-1 text-[10.5px] text-[color:var(--color-ink-soft)]">
                {p.uploadedByName ?? p.uploadedByRole.toLowerCase()} · {new Date(p.createdAt).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })}
              </div>
            </a>
          ))}
        </div>
      )}

      {canUpload && (
        <div className="mt-4 space-y-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional, e.g. 'Tomatoes ripe — picked extra')"
            className="w-full rounded-md border border-[color:var(--color-ink)]/15 px-3 py-2 text-[13px] outline-none focus:border-[color:var(--color-forest)]"
          />
          <label className="inline-flex items-center gap-3 cursor-pointer">
            <span className="rounded-md bg-[color:var(--color-forest)] text-white px-4 py-2 text-[13px] font-medium">
              {busy ? 'Uploading…' : 'Upload photo'}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickAndUpload(f);
                e.target.value = '';
              }}
              className="hidden"
            />
            <span className="text-[11px] text-[color:var(--color-ink-soft)]">JPG / PNG / WebP, up to 5 MB</span>
          </label>
          {error && <p className="text-[12px] text-[color:var(--color-terracotta)]">{error}</p>}
        </div>
      )}
    </section>
  );
}
