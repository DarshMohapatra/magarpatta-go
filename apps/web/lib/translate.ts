import 'server-only';
import type { Locale } from './i18n';

/**
 * Catalog name translation via MyMemory (https://mymemory.translated.net).
 * Chosen for the zero-friction signup story: no API key, no billing, no
 * credit card. Anonymous calls get 1,000 words/day; opting in by passing
 * a contact email (via `MYMEMORY_EMAIL` env var) raises the cap to 50,000
 * words/day — still no card required.
 *
 * MyMemory exposes one language pair per request, so translating into both
 * Hindi and Marathi means two parallel HTTP calls per item. For our short
 * noun-phrase use case (1-3 words per item) the round-trips are cheap and
 * the quota is several orders of magnitude beyond what any Phase-1 menu
 * needs.
 *
 * Optional env (recommended in production for the higher quota):
 *   MYMEMORY_EMAIL — any contact email; sent verbatim in the `de` param
 *                    so MyMemory can scope rate limits per project.
 *
 * When the call fails (timeout, rate limit, 5xx) the source text is
 * returned in every slot. The caller continues normally; the customer
 * renderer's English fallback keeps the page rendering.
 */

const ENDPOINT = 'https://api.mymemory.translated.net/get';

export interface TranslatedName {
  en: string;
  hi: string;
  mr: string;
}

function fallback(text: string): TranslatedName {
  return { en: text, hi: text, mr: text };
}

interface MyMemoryResponse {
  responseData?: { translatedText?: string; match?: number };
  responseStatus?: number;
  responseDetails?: string;
}

async function translateOne(text: string, source: Locale, target: Locale): Promise<string | null> {
  const params = new URLSearchParams({
    q: text,
    langpair: `${source}|${target}`,
  });
  const email = process.env.MYMEMORY_EMAIL;
  if (email) params.set('de', email);

  try {
    const resp = await fetch(`${ENDPOINT}?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      console.error('[translate] http error', resp.status, target, await resp.text().catch(() => ''));
      return null;
    }
    const data = (await resp.json()) as MyMemoryResponse;
    // MyMemory uses HTTP 200 + a status field in the body for rate-limit and
    // language-pair errors. 429 / 4xx come back here too. Anything other
    // than 200 in responseStatus is treated as a failure for this slot.
    if (data.responseStatus !== 200) {
      console.error('[translate] api error', data.responseStatus, target, data.responseDetails);
      return null;
    }
    const out = data.responseData?.translatedText?.trim();
    return out && out.length > 0 ? out : null;
  } catch (e) {
    console.error('[translate] failed', target, (e as Error).message);
    return null;
  }
}

export async function translateMenuName(
  rawText: string,
  sourceLang: Locale,
): Promise<TranslatedName> {
  const text = rawText.trim();
  if (!text) return { en: '', hi: '', mr: '' };

  // Always seed the source-language slot with the original — there's
  // nothing to translate there.
  const out: TranslatedName = { en: text, hi: text, mr: text };
  const targets: Locale[] = (['en', 'hi', 'mr'] as Locale[]).filter((l) => l !== sourceLang);

  // Fire the two non-source language pairs in parallel. Failures fall back
  // to the source text per-slot rather than blowing up the whole call.
  const results = await Promise.all(
    targets.map(async (target) => ({ target, text: await translateOne(text, sourceLang, target) })),
  );

  for (const r of results) {
    if (!r.text) continue;
    if (r.target === 'en') out.en = r.text;
    else if (r.target === 'hi') out.hi = r.text;
    else if (r.target === 'mr') out.mr = r.text;
  }
  return out;
}
