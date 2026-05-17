import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getVendorSession } from '@/lib/vendor-session';
import { getAdminSession } from '@/lib/admin-session';

/**
 * Client-side upload handler for delivery-proof images. The vendor or admin
 * hits this with `@vercel/blob/client`'s upload() — Vercel returns a signed
 * URL, the file goes straight to Blob storage, and we get the final public
 * URL via `onUploadCompleted`. No bytes flow through this server.
 *
 * Auth is enforced on the JSON token-generation step: anyone calling this
 * without a vendor or admin session gets a 401 before a signed URL is ever
 * minted.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const [vendor, admin] = await Promise.all([
    getVendorSession(),
    getAdminSession(),
  ]);
  if (!vendor && !admin) {
    return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  }

  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname) => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maximumSizeInBytes: 5 * 1024 * 1024,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // Nothing to do here — the order-proof POST handler is what writes
        // the DB row. This is just the file-upload side.
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
