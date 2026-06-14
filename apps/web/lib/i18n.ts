/**
 * Catalog i18n primitives. Phase 1 supports three customer-facing display
 * languages: English (default), Hindi, Marathi. Translations are pre-cached
 * on Product / Category / OrderItem rows by `lib/gemini.ts` at vendor save
 * time — runtime is a column read, never a network round-trip.
 *
 * The vendor types in ONE language (any of the three) and that text becomes
 * the source-of-truth for that row. `pickName` is the read helper used
 * everywhere a product/category name renders.
 */

export type Locale = 'en' | 'hi' | 'mr';

export const LOCALES: Locale[] = ['en', 'hi', 'mr'];

export const LOCALE_LABEL: Record<Locale, string> = {
  en: 'EN',
  hi: 'हिं',
  mr: 'मरा',
};

export const LOCALE_FULL: Record<Locale, string> = {
  en: 'English',
  hi: 'हिंदी',
  mr: 'मराठी',
};

/** Narrows an unknown string to a valid Locale, falling back to English. */
export function asLocale(v: unknown): Locale {
  return v === 'hi' || v === 'mr' ? v : 'en';
}

/**
 * Return the localized name for an item with English fallback. The fallback
 * chain is: requested lang → English → original (whatever the vendor typed).
 * Items often have only one column populated (vendor saved, Gemini was down)
 * so the chain is forgiving — we never render an empty string.
 */
export function pickName(
  item: { name: string; nameHi?: string | null; nameMr?: string | null },
  lang: Locale,
): string {
  if (lang === 'hi' && item.nameHi) return item.nameHi;
  if (lang === 'mr' && item.nameMr) return item.nameMr;
  return item.name;
}
