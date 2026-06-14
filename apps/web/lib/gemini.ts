import 'server-only';
import type { Locale } from './i18n';

/**
 * Thin Gemini REST wrapper for translating menu names. Called server-side
 * from POST/PATCH /api/vendor/products and from the category seeder.
 *
 * The vendor types one name in one language; this returns all three. When
 * GEMINI_API_KEY isn't set OR the API call fails, we return the source text
 * in all three slots — the row still saves, and the customer renderer's
 * English fallback keeps the page rendering.
 *
 * Required env: GEMINI_API_KEY (set on Vercel → Project Settings → Environment).
 * Model: gemini-2.5-flash — cheap + fast, accurate for short noun phrases.
 */

// gemini-2.0-flash chosen for the much more generous free-tier quota
// (1500 RPD vs 20 RPD on 2.5-flash) — accuracy for short noun-phrase
// translations is indistinguishable. Each model has its own quota, so
// switching here also frees up daily allowance immediately, even if 2.5
// was already exhausted.
const MODEL = 'gemini-2.0-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export interface TranslatedName {
  en: string;
  hi: string;
  mr: string;
}

const LANG_NAME: Record<Locale, string> = {
  en: 'English',
  hi: 'Hindi (Devanagari script)',
  mr: 'Marathi (Devanagari script)',
};

function buildPrompt(text: string, sourceLang: Locale): string {
  const src = LANG_NAME[sourceLang];
  return [
    `You translate short Indian grocery / produce item names from ${src} into English, Hindi, and Marathi.`,
    'Rules:',
    '- Output ONLY a JSON object with keys "en", "hi", "mr". No prose, no markdown, no code fences.',
    '- Keep numeric units (e.g. "250g", "1kg", "1 dozen") unchanged in every translation.',
    '- Common produce should use the common consumer term, not Latin or formal names.',
    '- If the input is already in the target language, return it verbatim in that key.',
    '',
    `Input: ${text}`,
  ].join('\n');
}

function safeParseJson(raw: string): unknown {
  // Gemini occasionally wraps the JSON in a ```json … ``` fence even when
  // asked not to. Strip it before parsing.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function fallback(text: string): TranslatedName {
  // When the model is unavailable, populate every column with the source text
  // so the row stays renderable. The customer renderer will still display
  // something — just not translated.
  return { en: text, hi: text, mr: text };
}

export async function translateMenuName(
  rawText: string,
  sourceLang: Locale,
): Promise<TranslatedName> {
  const text = rawText.trim();
  if (!text) return { en: '', hi: '', mr: '' };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[gemini] GEMINI_API_KEY not set — skipping translation for:', text);
    return fallback(text);
  }

  // Google AI Studio currently issues keys in two formats:
  //   - Classic API keys: AIzaSy… — auth via ?key=… query param
  //   - Newer scoped tokens (rolled out late 2025+): AQ.… — auth via
  //     Authorization: Bearer header, query param fails with 403
  // Auto-detect by prefix so the same code path works for either, and
  // operators can swap one for the other without a code change.
  const isClassicApiKey = apiKey.startsWith('AIza');
  const url = isClassicApiKey ? `${ENDPOINT}?key=${apiKey}` : ENDPOINT;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!isClassicApiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(text, sourceLang) }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
      // Short timeout — vendor's save form is waiting. If Gemini is slow we'd
      // rather fall back than block the UI.
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) {
      console.error('[gemini] http error', resp.status, 'auth=', isClassicApiKey ? 'query-key' : 'bearer', await resp.text().catch(() => ''));
      return fallback(text);
    }

    const data = (await resp.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const out = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = safeParseJson(out) as Partial<TranslatedName> | null;
    if (!parsed || typeof parsed !== 'object') return fallback(text);

    return {
      en: (parsed.en && String(parsed.en).trim()) || text,
      hi: (parsed.hi && String(parsed.hi).trim()) || text,
      mr: (parsed.mr && String(parsed.mr).trim()) || text,
    };
  } catch (e) {
    console.error('[gemini] translate failed', (e as Error).message);
    return fallback(text);
  }
}
