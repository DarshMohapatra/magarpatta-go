import type { ReactNode } from 'react';
import { BottomNav } from './bottom-nav';

/**
 * Mobile-first container for redesigned customer surfaces. Centers a
 * narrow column (max-w-md), reserves room at the bottom for the
 * BottomNav + iOS home-indicator safe area, and exposes a `topBar` slot
 * for the sticky page header.
 *
 * Desktop is intentionally constrained too — Lovable's design assumes a
 * mobile-first single-column. The classic `<NavbarWithSession>` stays
 * in place above this shell, so desktop users still see the full nav.
 */
export function MobileShell({
  topBar,
  children,
  hideBottomNav = false,
}: {
  topBar?: ReactNode;
  children: ReactNode;
  hideBottomNav?: boolean;
}) {
  return (
    <div className="font-display mx-auto w-full max-w-md bg-[color:var(--color-background)] text-[color:var(--color-foreground)] min-h-screen flex flex-col">
      {topBar && (
        <header className="sticky top-0 z-40 bg-[color:var(--color-background)]/95 backdrop-blur-md border-b border-[color:var(--color-border)]/40">
          {topBar}
        </header>
      )}
      <main
        className="flex-1 pb-24"
        style={{ paddingBottom: hideBottomNav ? undefined : `calc(5rem + env(safe-area-inset-bottom, 0px))` }}
      >
        {children}
      </main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
