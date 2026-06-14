'use client';

import { useState } from 'react';
import { LOCALES, LOCALE_LABEL, type Locale } from '@/lib/i18n';

/**
 * Customer-facing language pill. Three tabs: EN · हिं · मरा. Tapping one
 * fires PATCH /api/account/locale to set the `mg_locale` cookie, then
 * hard-reloads so every server component re-renders against the new
 * language. router.refresh() was racing against the cookie set + leaving
 * the menu in the old language until the customer manually reloaded;
 * window.location.reload after `await` is guaranteed-correct.
 *
 * Initial locale is read on the server (via lib/locale.getServerLocale)
 * and passed in as a prop, so the button highlights the right tab on first
 * paint without a useEffect.
 */
export function LocalePicker({ initial }: { initial: Locale }) {
  const [locale, setLocale] = useState<Locale>(initial);
  const [pending, setPending] = useState(false);

  async function pick(next: Locale) {
    if (next === locale || pending) return;
    setLocale(next); // optimistic for the pill highlight
    setPending(true);
    try {
      await fetch('/api/account/locale', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      });
      // Hard reload: any server-rendered component reads the cookie fresh,
      // and any in-flight client state (cart drawer) re-hydrates from cookies
      // / localStorage on mount. Safer than router.refresh() which sometimes
      // skipped re-rendering the cached menu.
      window.location.reload();
    } catch {
      // Network blip — revert the pill and let the customer try again.
      setLocale(initial);
      setPending(false);
    }
  }

  return (
    <div
      role="group"
      aria-label="Display language"
      className="inline-flex items-center rounded-full border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)]/70 backdrop-blur-sm overflow-hidden"
    >
      {LOCALES.map((lng) => (
        <button
          key={lng}
          type="button"
          aria-pressed={locale === lng}
          onClick={() => pick(lng)}
          disabled={pending && locale !== lng}
          className={`px-2.5 py-1 text-[11.5px] leading-none transition-colors ${
            locale === lng
              ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] font-medium'
              : 'text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-ink)]/5'
          }`}
        >
          {LOCALE_LABEL[lng]}
        </button>
      ))}
    </div>
  );
}
