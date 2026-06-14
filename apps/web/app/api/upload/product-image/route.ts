import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getVendorSession } from '@/lib/vendor-session';

/**
 * Client-side upload handler for product images uploaded from the vendor's
 * menu add/edit form. Mirrors the delivery-proof route — the browser hits
 * this with `@vercel/blob/client`'s `upload()`, Vercel returns a signed URL,
 * the file streams straight to Blob storage. The vendor session is checked
 * before a token is minted, so an unauthenticated request can't burn through
 * our Blob bandwidth quota.
 *
 * Returned URL is what the vendor then submits as `imageUrl` on the
 * product create/edit POST.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const vendor = await getVendorSession();
  if (!vendor) {
    console.error('[blob-upload] not signed in');
    return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  }
  if (vendor.approvalStatus !== 'APPROVED') {
    console.error('[blob-upload] vendor not approved', vendor.vendorId);
    return NextResponse.json({ ok: false, error: 'Shop is not yet approved.' }, { status: 403 });
  }

  // Loud-on-failure diagnostics: the most common cause of "Failed to retrieve
  // the client token" is BLOB_READ_WRITE_TOKEN missing from the Lambda
  // runtime env. Log it before handleUpload so we can tell from the runtime
  // logs whether the env reached us or not.
  const tokenPresent = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  console.log('[blob-upload] BLOB_READ_WRITE_TOKEN present:', tokenPresent, '· vendor:', vendor.vendorId);
  if (!tokenPresent) {
    return NextResponse.json(
      { ok: false, error: 'Blob storage is not configured on the server (BLOB_READ_WRITE_TOKEN missing).' },
      { status: 500 },
    );
  }

  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maximumSizeInBytes: 5 * 1024 * 1024,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // The product create/edit POST writes the URL onto the row — nothing
        // to do here.
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error('[blob-upload] handleUpload threw:', (e as Error).message);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
