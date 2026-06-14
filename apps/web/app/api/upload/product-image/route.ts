import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getVendorSession } from '@/lib/vendor-session';

/**
 * Direct server-side Blob upload. The vendor's browser sends the file as
 * multipart/form-data; we forward it to Vercel Blob via `put()` and return
 * the public URL.
 *
 * Previously this used `@vercel/blob/client`'s handleUpload (which mints a
 * client token, then the browser uploads directly to Blob). That flow kept
 * failing with "Failed to retrieve the client token" in production — likely
 * because the token-generation step has stricter env-var requirements that
 * weren't propagating through Turbo's strict env mode. The direct-put path
 * needs only BLOB_READ_WRITE_TOKEN at the moment of the put() call, no
 * pre-negotiation, no separate client SDK.
 *
 * Vercel Lambdas accept up to 4.5 MB request bodies on Hobby plans by
 * default; we cap at 5 MB earlier in the chain (matched on the client too).
 *
 * Returned URL is what the vendor then submits as `imageUrl` on the
 * product create/edit POST.
 */
export const maxDuration = 30;

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request): Promise<NextResponse> {
  const vendor = await getVendorSession();
  if (!vendor) {
    return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  }
  if (vendor.approvalStatus !== 'APPROVED') {
    return NextResponse.json({ ok: false, error: 'Shop is not yet approved.' }, { status: 403 });
  }

  // Log a non-sensitive preview of the token so the runtime logs prove
  // whether BLOB_READ_WRITE_TOKEN is reaching the Lambda. First 14 chars of
  // a Vercel Blob token is enough to identify the store without leaking the
  // secret part.
  const raw = process.env.BLOB_READ_WRITE_TOKEN;
  const preview = raw ? `${raw.slice(0, 14)}…(len=${raw.length})` : '(missing)';
  console.log('[blob-upload] token preview:', preview, '· vendor:', vendor.vendorId);
  if (!raw) {
    return NextResponse.json(
      { ok: false, error: 'Blob storage not configured: BLOB_READ_WRITE_TOKEN is empty on the server. Add it under Project Settings → Environment Variables and redeploy.' },
      { status: 500 },
    );
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const v = form.get('file');
    if (v instanceof File) file = v;
  } catch (e) {
    console.error('[blob-upload] failed to parse multipart:', (e as Error).message);
    return NextResponse.json({ ok: false, error: 'Could not read upload payload.' }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ ok: false, error: 'No file in request.' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ ok: false, error: `Unsupported type ${file.type}. Use JPG, PNG, or WebP.` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: 'File is larger than 5 MB.' }, { status: 400 });
  }

  try {
    // addRandomSuffix prevents two vendors uploading "tomato.jpg" from
    // overwriting each other. Pass token explicitly so we don't depend on
    // SDK env-var auto-discovery quirks.
    const blob = await put(`product-images/${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
      token: raw,
      contentType: file.type,
    });
    return NextResponse.json({ ok: true, url: blob.url });
  } catch (e) {
    const msg = (e as Error).message;
    console.error('[blob-upload] put() threw:', msg);
    return NextResponse.json({ ok: false, error: `Blob upload failed: ${msg}` }, { status: 500 });
  }
}
