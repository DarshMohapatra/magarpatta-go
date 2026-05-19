'use client';

import { useEffect, useState } from 'react';

/**
 * Small one-time bottom prompt shown only when:
 *   1. We're running in iOS Safari (no other browser on iOS supports
 *      Add-to-Home-Screen reliably), AND
 *   2. The app isn't already installed as a standalone PWA, AND
 *   3. The user hasn't dismissed the prompt before.
 *
 * iOS users famously don't discover the Share → Add to Home Screen flow.
 * This banner tells them exactly where to tap. Dismissal is persisted in
 * localStorage so it doesn't reappear after they close it.
 */
const DISMISS_KEY = 'mg_ios_install_dismissed_v1';

export function IosInstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const ua = window.navigator.userAgent;
      const isIos = /iPhone|iPad|iPod/.test(ua);
      const isSafari = isIos && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
      // Apple-specific check for installed standalone mode.
      const inStandalone =
        ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true) ||
        window.matchMedia('(display-mode: standalone)').matches;
      const dismissed = localStorage.getItem(DISMISS_KEY) === '1';
      if (isSafari && !inStandalone && !dismissed) {
        setShow(true);
      }
    } catch {
      /* localStorage blocked — fail silent. */
    }
  }, []);

  function dismiss() {
    setShow(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* noop */ }
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Magarpatta Go"
      className="fixed inset-x-3 bottom-3 z-[90] rounded-2xl bg-[color:var(--color-forest)] text-[color:var(--color-cream)] shadow-[0_24px_60px_-20px_rgba(15,15,14,0.45)] px-4 py-3.5 flex items-start gap-3 pwa-safe-bottom"
    >
      <div className="flex-1 text-[12.5px] leading-snug">
        <div className="font-medium text-[13.5px]">Install Magarpatta Go</div>
        <div className="mt-1 opacity-90">
          Tap{' '}
          <span aria-hidden className="inline-flex items-center justify-center w-5 h-5 rounded bg-[color:var(--color-cream)]/15 mx-0.5 align-text-bottom">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v12m0-12l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          {' '}at the bottom, then{' '}
          <span className="font-medium">Add to Home Screen</span>.
        </div>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 -mt-1 -mr-1 h-7 w-7 inline-flex items-center justify-center rounded-full hover:bg-[color:var(--color-cream)]/15"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
