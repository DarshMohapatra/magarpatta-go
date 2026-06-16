import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';
import { getServerLocale } from '@/lib/locale';
import { LocalePicker } from '@/components/locale-picker';
import { NotificationBell } from '@/components/notification-bell';
import { CartButton } from '@/components/cart-button';
import type { SessionUser } from '@/lib/session';

const DESKTOP_LINKS = [
  { href: '/home', label: 'Home' },
  { href: '/menu', label: 'Search' },
  { href: '/orders', label: 'Orders' },
  { href: '/profile', label: 'Profile' },
];

/**
 * Sticky mobile header for the redesigned customer surfaces. Shows the
 * township name (we're single-site for now — the switcher arrow is a hint
 * that more townships are coming), notifications bell, and locale pill.
 *
 * Renders inside <MobileShell topBar={...}>. Server component — keeps
 * cookies + session reads off the client.
 */
export async function TopBar({ session }: { session: SessionUser | null }) {
  const locale = await getServerLocale();
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
      <button
        type="button"
        className="flex items-center gap-2 text-left min-w-0"
        aria-label="Switch township"
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] text-sm font-bold">
          {siteConfig.siteName.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
            Deliver to
          </span>
          <span className="flex items-center gap-1">
            <span className="font-semibold text-[14px] text-[color:var(--color-foreground)] truncate">
              {siteConfig.siteName}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[color:var(--color-muted)]">
              <path d="M3 4.5L6 7.5L9 4.5" />
            </svg>
          </span>
        </span>
      </button>
      {/* Desktop nav — Home / Search / Orders / Profile.
         Hidden on mobile (BottomNav covers those tabs). */}
      <nav className="hidden lg:flex items-center gap-1">
        {DESKTOP_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="px-3 py-1.5 rounded-full text-[13px] font-semibold text-[color:var(--color-foreground)] hover:bg-[color:var(--color-surface-2)] transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-1.5">
        <LocalePicker initial={locale} />
        <NotificationBell signedIn={!!session} />
        <CartButton />
      </div>
    </div>
  );
}
