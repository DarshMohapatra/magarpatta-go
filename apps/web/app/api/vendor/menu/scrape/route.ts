import { NextResponse } from 'next/server';
import { getVendorSession } from '@/lib/vendor-session';
import { htmlToText } from '@/lib/menu-parser';
import { siteConfig } from '@/lib/site-config';

const MAX_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 8000;

// Block private/loopback ranges so a malicious QR can't make our server
// probe internal infrastructure (basic SSRF guard).
function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h === '0.0.0.0' || h === '::' || h === '::1') return true;
  if (h.startsWith('127.')) return true;
  if (h.startsWith('10.')) return true;
  if (h.startsWith('192.168.')) return true;
  if (h.startsWith('169.254.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (h.startsWith('fc') || h.startsWith('fd')) return true; // unique local IPv6
  return false;
}

interface Body {
  url?: string;
}

export async function POST(req: Request) {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const { url } = (await req.json()) as Body;
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ ok: false, error: 'No URL provided.' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ ok: false, error: 'That QR did not contain a valid URL.' }, { status: 400 });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return NextResponse.json({ ok: false, error: 'Only http/https URLs are supported.' }, { status: 400 });
  }
  if (isPrivateHost(parsed.hostname)) {
    return NextResponse.json({ ok: false, error: 'Refusing to fetch internal address.' }, { status: 400 });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(parsed.toString(), {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': `${siteConfig.platformName.replace(/\s/g, '')}-MenuImport/1.0`,
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5',
      },
    });
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: `Page returned ${r.status}.` }, { status: 400 });
    }
    const ctype = r.headers.get('content-type') ?? '';
    const buf = await r.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: 'Page too large (max 1.5 MB).' }, { status: 400 });
    }
    const body = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    const text = ctype.includes('text/html') || /<html/i.test(body) ? htmlToText(body) : body;
    return NextResponse.json({ ok: true, text, finalUrl: r.url });
  } catch (e) {
    const msg = (e as Error).name === 'AbortError' ? 'Page took too long to load.' : 'Could not load that page.';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  } finally {
    clearTimeout(timer);
  }
}
