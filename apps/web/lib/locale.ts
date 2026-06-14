import 'server-only';
import { cookies } from 'next/headers';
import { asLocale, type Locale } from './i18n';

/**
 * Source of truth for the customer's display language on the server. The
 * `mg_locale` cookie is set by the locale picker (and mirrored to
 * User.locale on PATCH /api/account/locale). Server pages read this and
 * forward it as a prop to product cards / category headers etc.
 *
 * Default: 'en'. No request → no cookie → English.
 */
export async function getServerLocale(): Promise<Locale> {
  const jar = await cookies();
  return asLocale(jar.get('mg_locale')?.value);
}

/** Cookie name and max-age, exported so the API route can set them too. */
export const LOCALE_COOKIE = 'mg_locale';
// 1 year. Picker overwrites this on every change.
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
