'use client';

import { useEffect, useState } from 'react';
import { asLocale, type Locale } from './i18n';

/**
 * Client-side locale read. Sources of truth, in order:
 *   - `mg_locale` cookie (set by the picker, also written by the server)
 *   - 'en' fallback
 *
 * Re-reads on the custom `mg-locale-changed` event that the LocalePicker
 * dispatches after a successful toggle, so already-mounted client trees
 * (cart drawer, header, etc.) update in real time without router refresh.
 */
export function useClientLocale(): Locale {
  const [locale, setLocale] = useState<Locale>(() => readCookieLocale());

  useEffect(() => {
    function refresh() { setLocale(readCookieLocale()); }
    window.addEventListener('mg-locale-changed', refresh);
    return () => window.removeEventListener('mg-locale-changed', refresh);
  }, []);

  return locale;
}

function readCookieLocale(): Locale {
  if (typeof document === 'undefined') return 'en';
  const m = document.cookie.match(/(?:^|;\s*)mg_locale=([^;]+)/);
  return asLocale(m?.[1]);
}
