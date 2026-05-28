'use client';

import { useState } from 'react';
import { upload } from '@vercel/blob/client';

/**
 * Image picker for the vendor's menu add/edit drawer. Two modes:
 *   - Upload: vendor picks a file from their phone/laptop, it goes straight
 *     to Vercel Blob via /api/upload/product-image, and the public URL is
 *     handed back to the parent form via `onChange`.
 *   - Paste URL: vendor pastes a hosted image URL (legacy path, kept so
 *     CDN-hosted images still work without re-uploading).
 *
 * The parent owns the final `imageUrl` string — this component is a thin
 * wrapper that calls onChange with the chosen URL. No DB writes here.
 */
export function ProductImagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickAndUpload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const blob = await upload(`product-images/${Date.now()}-${file.name}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload/product-image',
      });
      onChange(blob.url);
    } catch (e) {
      setError((e as Error).message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {value ? (
          // Live thumbnail of whatever URL is currently in the form. Vendor
          // sees instantly whether the link they pasted actually loads.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Item preview"
            className="h-16 w-16 rounded-lg object-cover border border-[color:var(--color-ink)]/12 bg-[color:var(--color-cream)]"
            onError={() => setError('That URL doesn\'t load as an image.')}
          />
        ) : (
          <div className="h-16 w-16 rounded-lg border border-dashed border-[color:var(--color-ink)]/20 bg-[color:var(--color-cream)]/60 flex items-center justify-center text-[10.5px] text-[color:var(--color-ink-soft)]/70 text-center px-1">
            No image
          </div>
        )}
        <div className="flex-1 flex flex-col gap-2">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <span className="rounded-md bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-3 py-1.5 text-[12px] font-medium hover:bg-[color:var(--color-forest-dark)]">
              {busy ? 'Uploading…' : value ? 'Replace photo' : 'Upload photo'}
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
          </label>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-[11.5px] text-[color:var(--color-terracotta)] hover:underline self-start"
            >
              Remove photo
            </button>
          )}
        </div>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="…or paste an image URL"
        className="w-full rounded-md border border-[color:var(--color-ink)]/15 px-3 py-2 text-[12.5px] outline-none focus:border-[color:var(--color-forest)]"
      />
      <p className="text-[10.5px] text-[color:var(--color-ink-soft)]/70">
        JPG / PNG / WebP, up to 5 MB. Square crops look best in the catalogue.
      </p>
      {error && <p className="text-[11.5px] text-[color:var(--color-terracotta)]">{error}</p>}
    </div>
  );
}
