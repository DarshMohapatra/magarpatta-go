import 'server-only';
import type { Locale } from './i18n';

/**
 * Catalog name translation via Microsoft Azure Translator. Replaces the
 * earlier Gemini-based implementation that kept tripping over Google Cloud
 * free-tier eligibility quirks (limit: 0 even with the API enabled).
 *
 * Azure Translator's F0 tier is 2 million characters / month free, which
 * is several orders of magnitude more than any Phase-1 menu needs. Hindi
 * and Marathi are both first-class supported languages.
 *
 * Required env (set on Vercel → Project Settings → Environment Variables,
 * and declared in turbo.json so they reach the build/runtime):
 *   AZURE_TRANSLATOR_KEY    — the "Key 1" or "Key 2" from the Translator
 *                             resource's Keys and Endpoint page.
 *   AZURE_TRANSLATOR_REGION — the Azure region the resource was created
 *                             in, e.g. "centralindia" or "eastus". Required
 *                             when using the global endpoint.
 *
 * When either env is missing OR the call fails, the helper returns the
 * source text in every slot. The caller continues normally — the customer
 * renderer's English fallback keeps the page rendering.
 */

const ENDPOINT = 'https://api.cognitive.microsofttranslator.com/translate';

export interface TranslatedName {
  en: string;
  hi: string;
  mr: string;
}

function fallback(text: string): TranslatedName {
  return { en: text, hi: text, mr: text };
}

export async function translateMenuName(
  rawText: string,
  sourceLang: Locale,
): Promise<TranslatedName> {
  const text = rawText.trim();
  if (!text) return { en: '', hi: '', mr: '' };

  const key = process.env.AZURE_TRANSLATOR_KEY;
  const region = process.env.AZURE_TRANSLATOR_REGION;
  if (!key || !region) {
    console.warn('[translate] AZURE_TRANSLATOR_KEY/REGION not set — skipping translation for:', text);
    return fallback(text);
  }

  // Build the query: source language + the two non-source target languages.
  // The source column will be filled with the original text (no round trip).
  const targets: Locale[] = (['en', 'hi', 'mr'] as Locale[]).filter((l) => l !== sourceLang);
  const params = new URLSearchParams({
    'api-version': '3.0',
    from: sourceLang,
  });
  for (const t of targets) params.append('to', t);

  try {
    const resp = await fetch(`${ENDPOINT}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Ocp-Apim-Subscription-Region': region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ text }]),
      // Vendor's save form is waiting — fall back fast on slow networks
      // rather than block the UI.
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) {
      console.error('[translate] http error', resp.status, await resp.text().catch(() => ''));
      return fallback(text);
    }

    const data = (await resp.json()) as Array<{
      translations?: Array<{ text: string; to: string }>;
    }>;

    // Start with source column = original; fill the other two from response.
    const out: TranslatedName = { en: text, hi: text, mr: text };
    const translations = data[0]?.translations ?? [];
    for (const t of translations) {
      if (t.to === 'en') out.en = t.text;
      else if (t.to === 'hi') out.hi = t.text;
      else if (t.to === 'mr') out.mr = t.text;
    }
    return out;
  } catch (e) {
    console.error('[translate] failed', (e as Error).message);
    return fallback(text);
  }
}
