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
    return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  }
  if (vendor.approvalStatus !== 'APPROVED') {
    return NextResponse.json({ ok: false, error: 'Shop is not yet approved.' }, { status: 403 });
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
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
