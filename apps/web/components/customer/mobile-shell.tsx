import type { ReactNode } from 'react';
import { BottomNav } from './bottom-nav';

/**
 * Responsive customer shell. On phones it locks to a narrow column
 * (max-w-md) with a bottom nav, exactly per Lovable spec. On desktop it
 * fills the full viewport (max-w-7xl) and the bottom nav disappears —
 * keeping the same brand chrome, fonts and colors, just unconstrained.
 *
 * Children get to use mobile-first grids (2-col → 4-col at lg) and read
 * sane padding from the outer container. The TopBar slot stays sticky
 * at the top across both breakpoints.
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
    <div className="font-display mx-auto w-full max-w-md lg:max-w-7xl bg-[color:var(--color-background)] text-[color:var(--color-foreground)] min-h-screen flex flex-col">
      {topBar && (
        <header className="sticky top-0 z-40 bg-[color:var(--color-background)]/95 backdrop-blur-md border-b border-[color:var(--color-border)]/40">
          {topBar}
        </header>
      )}
      <main
        className="flex-1 pb-24 lg:pb-12"
        style={{ paddingBottom: hideBottomNav ? undefined : `max(env(safe-area-inset-bottom, 0px), 1rem)` }}
      >
        {children}
      </main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
