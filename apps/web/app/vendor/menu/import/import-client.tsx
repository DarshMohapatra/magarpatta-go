'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { parseMenuText, type ParsedItem } from '@/lib/menu-parser';
import { siteConfig } from '@/lib/site-config';

type Mode = 'photo' | 'qr' | 'paste';
type Row = ParsedItem & { isVeg: boolean; unit: string; keep: boolean };

interface Category { slug: string; name: string }

const inp = 'mt-1 w-full rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-3 py-2 text-[13.5px] outline-none focus:border-[color:var(--color-forest)]';

export function MenuImportClient({ approvalStatus, categories }: { approvalStatus: string; categories: Category[] }) {
  const [mode, setMode] = useState<Mode>('photo');
  const [rows, setRows] = useState<Row[]>([]);
  const [categorySlug, setCategorySlug] = useState<string>(categories[0]?.slug ?? '');
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Original photos uploaded by the vendor — sent along with the parsed items
  // so the curator can verify against the menu picture. Persisted across mode
  // switches but cleared on submit.
  const [photos, setPhotos] = useState<File[]>([]);

  if (approvalStatus !== 'APPROVED') {
    return (
      <div className="rounded-2xl border border-[color:var(--color-saffron)]/30 bg-[color:var(--color-saffron)]/8 p-6">
        <h2 className="font-serif text-[22px]">Menu import unlocks after approval</h2>
        <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)]">
          Once {siteConfig.platformName} approves your shop, you&apos;ll be able to import items from a photo of your printed menu or a QR code.
        </p>
      </div>
    );
  }

  function pushItems(items: ParsedItem[]) {
    setErr(null);
    if (!items.length) return; // No items found is fine — curator will type from photo.
    setRows((prev) => {
      const seen = new Set(prev.map((p) => p.name.toLowerCase() + '|' + p.priceInr));
      const merged = [...prev];
      for (const it of items) {
        const key = it.name.toLowerCase() + '|' + it.priceInr;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push({ name: it.name, priceInr: it.priceInr, isVeg: true, unit: it.unit ?? '', keep: true });
      }
      return merged;
    });
  }

  async function submit() {
    if (!categorySlug) { setErr('Pick a category.'); return; }
    if (mode === 'photo' && photos.length === 0) {
      setErr('Add at least one menu photo first.');
      return;
    }
    if ((mode === 'qr' || mode === 'paste') && rows.length === 0) {
      setErr('Nothing detected yet. Run a scan or paste menu text first.');
      return;
    }
    const itemsToSend = rows.filter((r) => r.keep && r.name.trim() && r.priceInr > 0);
    setSubmitting(true);
    setErr(null);
    try {
      // Compress the original photos so the curator can authenticate items
      // against the source. Cap each at ~1200 px wide / JPEG q=0.8 → typically
      // 80–250 KB each. Skip silently if browser doesn't support canvas.
      const images: Array<{ dataUrl: string }> = [];
      for (const f of photos.slice(0, 6)) {
        try {
          const dataUrl = await compressImageToDataUrl(f, 1200, 0.8);
          if (dataUrl) images.push({ dataUrl });
        } catch { /* ignore compression failures — submit text-only */ }
      }

      const r = await fetch('/api/vendor/menu/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorySlug,
          source: mode,
          images,
          items: itemsToSend.map((it) => ({
            name: it.name.trim(),
            mrpInr: it.priceInr,
            isVeg: it.isVeg,
            unit: it.unit.trim() || undefined,
            isRegulated: false,
          })),
        }),
      });
      const j = await r.json();
      if (!j.ok) { setErr(j.error ?? 'Import failed.'); return; }
      const itemsLabel = j.queued > 0
        ? `${j.queued} parsed item${j.queued === 1 ? '' : 's'}`
        : `${images.length} photo${images.length === 1 ? '' : 's'}`;
      setToast(`Sent ${itemsLabel} to curator ✓`);
      setRows([]);
      setPhotos([]);
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSubmitting(false);
    }
  }

  async function compressImageToDataUrl(file: File, maxWidth: number, quality: number): Promise<string | null> {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = url;
      });
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL('image/jpeg', quality);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Menu import</div>
          <h1 className="mt-2 font-serif text-[32px] sm:text-[40px] leading-[1.02] tracking-[-0.02em]">
            Send your menu to a <span className="italic text-[color:var(--color-forest)]">human curator.</span>
          </h1>
          <p className="mt-2 text-[12.5px] text-[color:var(--color-ink-soft)] max-w-xl">
            Snap a photo of your printed menu (or scan a QR / paste text). Our curator authenticates each item against your photo, fixes anything our OCR missed, then forwards to admin. You don&apos;t edit anything yourself.
          </p>
        </div>
        <Link href="/vendor/menu" className="text-[12.5px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)]">
          ← Back to menu
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['photo', 'qr', 'paste'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-full px-4 py-1.5 text-[12.5px] border ${
              mode === m
                ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] border-[color:var(--color-forest)]'
                : 'bg-[color:var(--color-paper)] text-[color:var(--color-ink-soft)] border-[color:var(--color-ink)]/12 hover:text-[color:var(--color-forest)]'
            }`}
          >
            {m === 'photo' ? 'From photo' : m === 'qr' ? 'From QR code' : 'Paste text'}
          </button>
        ))}
      </div>

      {mode === 'photo' && <PhotoFlow onItems={pushItems} onPhotos={(files) => setPhotos((prev) => [...prev, ...files])} busy={busy} setBusy={setBusy} setProgress={setProgress} />}
      {mode === 'qr' && <QrFlow onItems={pushItems} busy={busy} setBusy={setBusy} />}
      {mode === 'paste' && <PasteFlow onItems={pushItems} />}

      {progress && <div className="text-[12.5px] text-[color:var(--color-ink-soft)]">{progress}</div>}
      {err && <div className="rounded-xl bg-[color:var(--color-terracotta)]/10 border border-[color:var(--color-terracotta)]/25 px-4 py-3 text-[13px] text-[color:var(--color-terracotta-dark)]">{err}</div>}

      {(rows.length > 0 || photos.length > 0) && (
        <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-5 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/65">Ready to send</div>
              <div className="font-serif text-[22px] mt-0.5">
                {photos.length > 0 && `${photos.length} photo${photos.length === 1 ? '' : 's'}`}
                {photos.length > 0 && rows.length > 0 && ' · '}
                {rows.length > 0 && `${rows.length} item${rows.length === 1 ? '' : 's'} pre-parsed`}
              </div>
              <div className="text-[12px] text-[color:var(--color-ink-soft)] mt-1 max-w-md">
                The curator will check every item against your photo and fix what OCR missed. Even if nothing was parsed, send the photos and they&apos;ll type from scratch.
              </div>
            </div>
            <label className="block min-w-[180px]">
              <span className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Category</span>
              <select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} className={inp}>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button disabled={submitting} onClick={submit} className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-2.5 text-[13.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50">
              {submitting ? 'Sending…' : 'Send to curator'}
            </button>
            <button disabled={submitting} onClick={() => { setRows([]); setPhotos([]); }} className="rounded-full border border-[color:var(--color-ink)]/15 px-5 py-2.5 text-[13px] hover:border-[color:var(--color-terracotta)]/40 hover:text-[color:var(--color-terracotta)] disabled:opacity-50">
              Clear
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-2.5 text-[13px] shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function PhotoFlow({ onItems, onPhotos, busy, setBusy, setProgress }: {
  onItems: (items: ParsedItem[]) => void;
  onPhotos: (files: File[]) => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
  setProgress: (s: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    onPhotos(Array.from(files));
    setBusy(true);
    setProgress('Loading OCR engine…');
    try {
      // Tesseract is large (~3 MB wasm) — load on-demand only.
      const Tesseract = (await import('tesseract.js')).default;
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setProgress(`OCR: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      const charWhitelist =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .-/()&₹Rs.,';

      await worker.setParameters({
        tessedit_pageseg_mode: '6' as never,
        tessedit_char_whitelist: charWhitelist,
        preserve_interword_spaces: '1' as never,
      });

      const all: ParsedItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgress(`Pre-processing image ${i + 1} of ${files.length}…`);
        const { canvas: prepCanvas } = await preprocessImage(f);

        // Auto-split multi-column menus at vertical gutters. For single-column
        // images this returns just the original.
        const columns = splitIntoColumns(prepCanvas);
        setProgress(`Image ${i + 1}/${files.length}: ${columns.length} column${columns.length === 1 ? '' : 's'} detected`);

        for (let c = 0; c < columns.length; c++) {
          setProgress(`Image ${i + 1}/${files.length}: column ${c + 1}/${columns.length}, pass 1…`);
          await worker.setParameters({ tessedit_pageseg_mode: '6' as never });
          const r1 = await worker.recognize(columns[c]);

          setProgress(`Image ${i + 1}/${files.length}: column ${c + 1}/${columns.length}, pass 2…`);
          await worker.setParameters({ tessedit_pageseg_mode: '4' as never });
          const r2 = await worker.recognize(columns[c]);

          // Pass 3: sparse text — wins on menus with scattered items, big
          // gaps, or non-list layouts (decorative posters with islands of text).
          setProgress(`Image ${i + 1}/${files.length}: column ${c + 1}/${columns.length}, pass 3…`);
          await worker.setParameters({ tessedit_pageseg_mode: '11' as never });
          const r3 = await worker.recognize(columns[c]);

          const merged = `${r1.data.text}\n${r2.data.text}\n${r3.data.text}`;
          all.push(...parseMenuText(merged));
        }
      }
      await worker.terminate();
      onItems(all);
      setProgress(`Found ${all.length} item${all.length === 1 ? '' : 's'} across ${files.length} image${files.length === 1 ? '' : 's'}.`);
      setTimeout(() => setProgress(null), 3000);
    } catch (e) {
      setProgress(`OCR failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Prepare a photo for Tesseract:
   *  - upscale to ~1800 px wide if smaller (Tesseract works best around 300 DPI)
   *  - convert to grayscale
   *  - auto-invert if the background is dark
   *  - Otsu threshold (auto-picks the cutoff per image — much better than 150 fixed)
   */
  async function preprocessImage(file: File): Promise<{ canvas: HTMLCanvasElement }> {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = url;
      });

      const target = 1800;
      const scale = img.width < target ? target / img.width : 1;
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas not available');
      ctx.drawImage(img, 0, 0, w, h);

      const id = ctx.getImageData(0, 0, w, h);
      const px = id.data;

      // Pass 1: convert to grayscale in place + build a histogram for Otsu.
      const hist = new Uint32Array(256);
      const gray = new Uint8ClampedArray(w * h);
      for (let i = 0, j = 0; i < px.length; i += 4, j++) {
        const g = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
        gray[j] = g;
        hist[g]++;
      }

      // Detect dark background by mean luminance of the four corner regions.
      const cornerMean = sampleMean(gray, w, h, 40);
      const invert = cornerMean < 110;
      if (invert) {
        for (let i = 0; i < gray.length; i++) gray[i] = 255 - gray[i];
        // Histogram needs flipping after invert.
        const flipped = new Uint32Array(256);
        for (let v = 0; v < 256; v++) flipped[255 - v] = hist[v];
        hist.set(flipped);
      }

      // Otsu — find the threshold that minimises intra-class variance.
      const total = w * h;
      let sumAll = 0;
      for (let v = 0; v < 256; v++) sumAll += v * hist[v];
      let sumB = 0; let wB = 0; let maxVar = 0; let threshold = 127;
      for (let v = 0; v < 256; v++) {
        wB += hist[v];
        if (wB === 0) continue;
        const wF = total - wB;
        if (wF === 0) break;
        sumB += v * hist[v];
        const mB = sumB / wB;
        const mF = (sumAll - sumB) / wF;
        const between = wB * wF * (mB - mF) * (mB - mF);
        if (between > maxVar) { maxVar = between; threshold = v; }
      }

      // Apply the threshold + write back to the canvas data.
      for (let i = 0, j = 0; i < px.length; i += 4, j++) {
        const v = gray[j] > threshold ? 255 : 0;
        px[i] = v; px[i + 1] = v; px[i + 2] = v; px[i + 3] = 255;
      }
      ctx.putImageData(id, 0, 0);

      return { canvas };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Find vertical gutters in a binarized canvas and slice the image at them.
   * Returns one HTMLCanvasElement per detected column. For images that don't
   * have clear column gutters this returns the original canvas unchanged.
   */
  function splitIntoColumns(canvas: HTMLCanvasElement): HTMLCanvasElement[] {
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [canvas];
    const data = ctx.getImageData(0, 0, w, h).data;

    // Per-column dark-pixel ratio. Black = dark pixel = text.
    const colDarkPct = new Float32Array(w);
    for (let x = 0; x < w; x++) {
      let dark = 0;
      for (let y = 0; y < h; y++) {
        const i = (y * w + x) * 4;
        if (data[i] < 128) dark++;
      }
      colDarkPct[x] = dark / h;
    }

    // A column is a "gutter" candidate if its dark ratio is below this threshold.
    // 2% catches genuine whitespace between columns; individual letter gaps
    // are typically < 0.5% so this stays well above letter spacing.
    const GUTTER_MAX = 0.020;
    // Minimum gutter width — lowered from 2.5% to 1.5% so menus with thinner
    // gutters (very common on decorative posters) still get split.
    const MIN_GUTTER_PX = Math.max(16, Math.floor(w * 0.015));
    // Minimum content (non-gutter) column width.
    const MIN_COL_PX = Math.max(100, Math.floor(w * 0.08));

    // Find gutter regions: contiguous runs of low-density columns.
    interface Range { start: number; end: number }
    const gutters: Range[] = [];
    let runStart = -1;
    for (let x = 0; x <= w; x++) {
      const isGutter = x < w && colDarkPct[x] < GUTTER_MAX;
      if (isGutter && runStart === -1) runStart = x;
      else if (!isGutter && runStart !== -1) {
        if (x - runStart >= MIN_GUTTER_PX) gutters.push({ start: runStart, end: x });
        runStart = -1;
      }
    }

    // Strip leading/trailing gutter (the page margins) — those aren't column breaks.
    while (gutters.length && gutters[0].start === 0) gutters.shift();
    while (gutters.length && gutters[gutters.length - 1].end === w) gutters.pop();

    if (gutters.length === 0) return [canvas];

    // Build the column ranges between (and around) the gutters.
    const cols: Range[] = [];
    let cursor = 0;
    for (const g of gutters) {
      if (g.start - cursor >= MIN_COL_PX) cols.push({ start: cursor, end: g.start });
      cursor = g.end;
    }
    if (w - cursor >= MIN_COL_PX) cols.push({ start: cursor, end: w });

    if (cols.length <= 1) return [canvas];

    // Crop each column into its own canvas.
    return cols.map((col) => {
      const cw = col.end - col.start;
      const out = document.createElement('canvas');
      out.width = cw;
      out.height = h;
      const octx = out.getContext('2d');
      if (octx) octx.drawImage(canvas, col.start, 0, cw, h, 0, 0, cw, h);
      return out;
    });
  }

  function sampleMean(gray: Uint8ClampedArray, w: number, h: number, size: number): number {
    const corners: Array<[number, number]> = [
      [0, 0], [w - size, 0], [0, h - size], [w - size, h - size],
    ];
    let sum = 0; let n = 0;
    for (const [x0, y0] of corners) {
      for (let y = y0; y < y0 + size && y < h; y++) {
        for (let x = x0; x < x0 + size && x < w; x++) {
          sum += gray[y * w + x]; n++;
        }
      }
    }
    return n ? sum / n : 128;
  }

  return (
    <div className="rounded-2xl border border-dashed border-[color:var(--color-ink)]/20 bg-[color:var(--color-paper)] p-8 text-center">
      <p className="font-serif text-[20px]">Photograph your printed menu</p>
      <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-soft)]/75 max-w-md mx-auto">
        Hold steady, good light. You can upload several photos — we&apos;ll send them all to the curator together.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button disabled={busy} onClick={() => fileRef.current?.click()} className="mt-5 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-2.5 text-[13.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50">
        {busy ? 'Working…' : 'Choose photo(s)'}
      </button>
      <p className="mt-3 text-[11px] text-[color:var(--color-ink-soft)]/60">
        OCR runs in your browser &mdash; no upload to a server.
      </p>
    </div>
  );
}

function QrFlow({ onItems, busy, setBusy }: {
  onItems: (items: ParsedItem[]) => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
}) {
  const [scanning, setScanning] = useState(false);
  const [lastValue, setLastValue] = useState<string | null>(null);
  const [scanErr, setScanErr] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  useEffect(() => {
    return () => {
      // Stop the camera if the component unmounts mid-scan.
      scannerRef.current?.stop().catch(() => {}).then(() => scannerRef.current?.clear());
    };
  }, []);

  async function start() {
    setScanErr(null);
    setLastValue(null);
    if (!containerRef.current) return;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const id = 'mg-qr-reader';
      containerRef.current.id = id;
      const scanner = new Html5Qrcode(id);
      scannerRef.current = scanner as unknown as { stop: () => Promise<void>; clear: () => void };
      setScanning(true);
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decoded: string) => {
          await scanner.stop();
          scanner.clear();
          scannerRef.current = null;
          setScanning(false);
          setLastValue(decoded);
          await handleDecoded(decoded);
        },
        () => { /* ignore per-frame failures */ },
      );
    } catch (e) {
      setScanErr(`Camera error: ${(e as Error).message}. Try the URL or paste tab instead.`);
      setScanning(false);
    }
  }

  async function stop() {
    try {
      await scannerRef.current?.stop();
      scannerRef.current?.clear();
    } catch {/* ignore */}
    scannerRef.current = null;
    setScanning(false);
  }

  async function handleDecoded(value: string) {
    setBusy(true);
    try {
      const looksLikeUrl = /^https?:\/\//i.test(value.trim());
      if (looksLikeUrl) {
        const r = await fetch('/api/vendor/menu/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: value.trim() }),
        });
        const j = await r.json();
        if (!j.ok) { setScanErr(j.error ?? 'Could not load that page.'); return; }
        onItems(parseMenuText(j.text));
      } else {
        // Treat as raw menu text in the QR payload.
        onItems(parseMenuText(value));
      }
    } finally {
      setBusy(false);
    }
  }

  async function manualUrl(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const u = String(fd.get('url') ?? '').trim();
    if (!u) return;
    setLastValue(u);
    await handleDecoded(u);
  }

  return (
    <div className="rounded-2xl border border-dashed border-[color:var(--color-ink)]/20 bg-[color:var(--color-paper)] p-6 space-y-4">
      <div className="text-center">
        <p className="font-serif text-[20px]">Scan a menu QR code</p>
        <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-soft)]/75 max-w-md mx-auto">
          Already have a QR that opens your menu page (Google Business, Zomato, your own site)? Scan it &mdash; we&apos;ll fetch and parse it.
        </p>
      </div>

      <div ref={containerRef} className="mx-auto max-w-[320px] rounded-xl overflow-hidden bg-[color:var(--color-ink)]/5 aspect-square flex items-center justify-center">
        {!scanning && <span className="text-[12px] text-[color:var(--color-ink-soft)]/60 px-4 text-center">Press &ldquo;Start camera&rdquo; to begin scanning.</span>}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {!scanning ? (
          <button disabled={busy} onClick={start} className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-2 text-[13px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50">
            Start camera
          </button>
        ) : (
          <button onClick={stop} className="rounded-full border border-[color:var(--color-terracotta)]/40 text-[color:var(--color-terracotta)] px-5 py-2 text-[13px] hover:bg-[color:var(--color-terracotta)]/8">
            Stop
          </button>
        )}
      </div>

      <form onSubmit={manualUrl} className="border-t border-[color:var(--color-ink)]/8 pt-4">
        <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Or paste a menu URL</div>
        <div className="mt-1 flex gap-2">
          <input name="url" type="url" placeholder="https://..." className={inp + ' mt-0 flex-1'} />
          <button disabled={busy} className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-4 py-2 text-[12.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50">
            Fetch
          </button>
        </div>
      </form>

      {lastValue && (
        <div className="text-[11.5px] text-[color:var(--color-ink-soft)]/70 break-all">
          Scanned: <span className="text-[color:var(--color-ink)]">{lastValue}</span>
        </div>
      )}
      {scanErr && <div className="text-[12.5px] text-[color:var(--color-terracotta)]">{scanErr}</div>}
    </div>
  );
}

function PasteFlow({ onItems }: { onItems: (items: ParsedItem[]) => void }) {
  const [text, setText] = useState('');
  return (
    <div className="rounded-2xl border border-dashed border-[color:var(--color-ink)]/20 bg-[color:var(--color-paper)] p-6 space-y-3">
      <div>
        <p className="font-serif text-[20px]">Paste menu text</p>
        <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-soft)]/75">
          One item per line, with the price at the end. Example: <span className="font-mono">Paneer Tikka 240</span>
        </p>
      </div>
      <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} className={inp} placeholder={'Veg Hakka Noodles 180\nPaneer Tikka  240\nMasala Dosa  120'} />
      <div>
        <button onClick={() => onItems(parseMenuText(text))} className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-2 text-[13px] font-medium hover:bg-[color:var(--color-forest-dark)]">
          Parse
        </button>
      </div>
    </div>
  );
}
