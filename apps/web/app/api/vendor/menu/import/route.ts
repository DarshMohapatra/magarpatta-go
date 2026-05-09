import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';
import { logActivity } from '@/lib/activity-log';

interface ImportItem {
  name?: string;
  priceInr?: number;
  mrpInr?: number;
  isVeg?: boolean;
  isRegulated?: boolean;
  unit?: string;
  description?: string;
}

interface ImportImage {
  dataUrl?: string; // "data:image/jpeg;base64,..."
}

interface Body {
  categorySlug?: string;
  items?: ImportItem[];
  source?: 'photo' | 'qr' | 'url' | 'paste';
  images?: ImportImage[];
}

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 1_500_000;

export async function POST(req: Request) {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (s.approvalStatus !== 'APPROVED') {
    return NextResponse.json({ ok: false, error: 'Shop is not yet approved.' }, { status: 403 });
  }

  const b = (await req.json()) as Body;
  const categorySlug = (b.categorySlug ?? '').trim();
  const items = Array.isArray(b.items) ? b.items : [];
  const source = b.source ?? 'paste';
  if (!categorySlug) return NextResponse.json({ ok: false, error: 'Pick a category for the items.' }, { status: 400 });
  if (items.length === 0) return NextResponse.json({ ok: false, error: 'No items to import.' }, { status: 400 });
  if (items.length > 200) return NextResponse.json({ ok: false, error: 'Too many items in one batch (max 200).' }, { status: 400 });

  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!category) return NextResponse.json({ ok: false, error: 'Unknown category.' }, { status: 400 });

  // Sanitise items into the JSON we'll persist for the curator.
  const cleanItems = items
    .map((raw) => {
      const name = (raw.name ?? '').trim();
      const mrp = Math.max(0, Math.floor(raw.mrpInr ?? raw.priceInr ?? 0));
      if (!name || mrp <= 0) return null;
      const isRegulated = raw.isRegulated ?? false;
      const priceInr = isRegulated
        ? mrp
        : (typeof raw.priceInr === 'number' && raw.priceInr > mrp ? Math.floor(raw.priceInr) : mrp + 1);
      return {
        name,
        mrpInr: mrp,
        priceInr,
        isVeg: raw.isVeg ?? true,
        isRegulated,
        unit: raw.unit?.trim() || null,
        description: raw.description?.trim() || null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (cleanItems.length === 0) {
    return NextResponse.json({ ok: false, error: 'No valid items to import.' }, { status: 400 });
  }

  // Decode incoming images. Browser will already have compressed them
  // (imports cap at ~1.5 MB per image post-compression).
  const incoming = Array.isArray(b.images) ? b.images.slice(0, MAX_IMAGES) : [];
  const decoded: Array<{ bytes: Uint8Array; mime: string }> = [];
  for (const im of incoming) {
    const m = im.dataUrl?.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
    if (!m) continue;
    const mime = m[1];
    const buf = Buffer.from(m[2], 'base64');
    if (buf.byteLength > MAX_IMAGE_BYTES) continue;
    // Copy into a fresh ArrayBuffer-backed Uint8Array — Prisma's Bytes type
    // rejects ArrayBufferLike (which Buffer can carry).
    const bytes = new Uint8Array(buf.byteLength);
    bytes.set(buf);
    decoded.push({ bytes, mime });
  }

  const job = await prisma.menuImportJob.create({
    data: {
      vendorId: s.vendorId,
      categorySlug,
      source,
      items: cleanItems as never,
      status: 'PENDING_CURATOR',
      images: decoded.length
        ? {
            create: decoded.map((d, i) => ({ bytes: d.bytes, mime: d.mime, ord: i })) as never,
          }
        : undefined,
    },
  });

  await logActivity({
    actorRole: 'VENDOR',
    actorId: s.vendorId,
    actorName: s.shopName,
    action: 'MENU_IMPORT_SUBMIT',
    summary: `${s.shopName} sent ${cleanItems.length} item${cleanItems.length === 1 ? '' : 's'} (${source}) to curator`,
    metadata: { jobId: job.id, categorySlug, source, itemCount: cleanItems.length, imageCount: decoded.length },
  });

  return NextResponse.json({ ok: true, jobId: job.id, queued: cleanItems.length });
}
