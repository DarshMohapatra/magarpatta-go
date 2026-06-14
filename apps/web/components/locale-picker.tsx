'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LOCALES, LOCALE_LABEL, type Locale } from '@/lib/i18n';

/**
 * Customer-facing language pill. Three tabs: EN · हिं · मरा. Tapping one
 * fires PATCH /api/account/locale, which sets the `mg_locale` cookie (and
 * mirrors to User.locale when signed in). Then router.refresh() so server
 * components re-render with the new language — no full reload, no flash.
 *
 * Initial locale is read on the server (via lib/locale.getServerLocale)
 * and passed in as a prop, so the button highlights the right tab on first
 * paint without a useEffect.
 */
export function LocalePicker({ initial }: { initial: Locale }) {
  const [locale, setLocale] = useState<Locale>(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function pick(next: Locale) {
    if (next === locale) return;
    setLocale(next); // optimistic
    fetch('/api/account/locale', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: next }),
    })
      .then(() => {
        // Tell already-mounted client components (cart drawer, etc.) that the
        // locale changed so they re-read the cookie without waiting for a
        // navigation.
        window.dispatchEvent(new CustomEvent('mg-locale-changed', { detail: next }));
      })
      .catch(() => {
        // Cookie set failed somehow — UI is already optimistic. The next
        // navigation will re-read the (unchanged) cookie and snap back.
      });
    startTransition(() => router.refresh());
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
