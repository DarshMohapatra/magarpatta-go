'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
import { siteConfig } from '@/lib/site-config';

export interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const VENDOR_NAV: NavItem[] = [
  { href: '/vendor',           label: 'Dashboard',  icon: <IconGrid /> },
  { href: '/vendor/orders',    label: 'Orders',     icon: <IconList /> },
  { href: '/vendor/menu',      label: 'Inventory',  icon: <IconBox /> },
  { href: '/vendor/payouts',   label: 'Payouts',    icon: <IconCash /> },
  { href: '/vendor/shop',      label: 'Settings',   icon: <IconCog /> },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin',                 label: 'Ops dashboard',    icon: <IconGrid /> },
  { href: '/admin/vendors',         label: 'Vendor approvals', icon: <IconStore /> },
  { href: '/admin/townships',       label: 'Townships',        icon: <IconGlobe /> },
  { href: '/admin/support',         label: 'Helpdesk',         icon: <IconChat /> },
];

// Exported icons so auxiliary shells (rider, curator, helpdesk, super-admin)
// can compose their own NAV without re-implementing icons.
export const Icons = {
  Grid: IconGrid,
  List: IconList,
  Box: IconBox,
  Cash: IconCash,
  Cog: IconCog,
  Store: IconStore,
  Globe: IconGlobe,
  Chat: IconChat,
};

/**
 * Dark-mode desktop shell shared by the vendor + admin portals. Replaces
 * the previous top-tab layouts (`components/vendor/vendor-shell.tsx`,
 * `components/admin/admin-shell.tsx`) with a Lovable-style sidebar +
 * top bar. Sets `class="dark"` on its outer container so the redesigned
 * tokens swap to the dark palette defined in globals.css.
 *
 * `surface` controls the nav items and the chip label. Add more surfaces
 * (rider, curator, super-admin) by adding new nav arrays + a case here.
 */
export function PartnerShell({
  surface,
  surfaceLabel,
  navItems,
  sessionEndpoint: sessionEndpointProp,
  signinHref: signinHrefProp,
  displayName,
  approvalStatus,
  children,
}: {
  surface: 'vendor' | 'admin' | 'rider' | 'curator' | 'helpdesk' | 'super-admin';
  /** Override the auto-derived label "Vendor portal" etc. */
  surfaceLabel?: string;
  /** Custom nav items for auxiliary surfaces (rider, curator, etc.). */
  navItems?: NavItem[];
  /** Override the auto-derived sign-out endpoint. */
  sessionEndpoint?: string;
  /** Override the auto-derived sign-in redirect. */
  signinHref?: string;
  displayName: string;
  approvalStatus?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [signingOut, setSigningOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const nav = navItems ?? (surface === 'vendor' ? VENDOR_NAV : ADMIN_NAV);
  const sessionEndpoint = sessionEndpointProp ?? (surface === 'vendor' ? '/api/vendor/session' : '/api/admin/session');
  const signinHref = signinHrefProp ?? (surface === 'vendor' ? '/vendor/signin' : '/admin/signin');

  async function signOut() {
    setSigningOut(true);
    try { await fetch(sessionEndpoint, { method: 'DELETE' }); } catch { /* ignore */ }
    startTransition(() => { router.push(signinHref); router.refresh(); });
  }

  return (
    <div className="dark font-display min-h-screen bg-[color:var(--color-background)] text-[color:var(--color-foreground)]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 z-30 bg-black/60"
          aria-hidden
        />
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={
            'fixed inset-y-0 left-0 z-40 w-64 transform border-r border-[color:var(--color-border)] bg-[color:var(--color-surface)] transition-transform lg:translate-x-0 lg:static lg:z-0 ' +
            (sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
          }
        >
          <div className="px-5 py-5 flex items-center gap-2.5 border-b border-[color:var(--color-border)]">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] text-sm font-bold">
              {siteConfig.wordmarkRoot.slice(0, 2)}
            </span>
            <div className="min-w-0">
              <div className="font-bold text-[14px] tracking-tight truncate">
                {siteConfig.wordmarkRoot} Go
              </div>
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
                {surfaceLabel ?? labelForSurface(surface)}
              </div>
            </div>
          </div>

          <nav className="px-3 py-4">
            <ul className="space-y-1">
              {nav.map((n) => {
                const active = pathname === n.href || (n.href !== '/vendor' && n.href !== '/admin' && pathname.startsWith(n.href));
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      onClick={() => setSidebarOpen(false)}
                      className={
                        'flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-[13px] transition-colors ' +
                        (active
                          ? 'bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)] font-semibold'
                          : 'text-[color:var(--color-muted)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-foreground)]')
                      }
                    >
                      <span className="shrink-0">{n.icon}</span>
                      {n.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="absolute bottom-4 left-3 right-3">
            <button
              onClick={signOut}
              disabled={signingOut}
              className="w-full text-left flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-[12.5px] text-[color:var(--color-muted)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-foreground)]"
            >
              <IconExit />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0 lg:ml-0">
          {/* Top bar */}
          <header className="sticky top-0 z-20 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]/95 backdrop-blur-md">
            <div className="flex items-center justify-between gap-4 px-4 lg:px-8 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-[color:var(--color-surface-2)]"
                  aria-label="Open menu"
                >
                  <IconMenu />
                </button>
                <div className="hidden md:flex items-center gap-2 rounded-[var(--radius-lg)] bg-[color:var(--color-surface-2)] border border-[color:var(--color-border)] px-3 py-1.5 min-w-[280px]">
                  <IconSearch />
                  <input
                    placeholder={surface === 'vendor' ? 'Search orders, products…' : 'Search vendors, tickets, orders…'}
                    className="bg-transparent outline-none text-[13px] text-[color:var(--color-foreground)] placeholder:text-[color:var(--color-muted)] w-full"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                {surface === 'admin' && (
                  <button className="hidden md:inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-3 py-1.5 text-[12px] font-medium">
                    <IconGlobe />
                    Live across all townships
                    <IconChevron />
                  </button>
                )}
                <button
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-[color:var(--color-surface-2)]"
                  aria-label="Notifications"
                >
                  <IconBell />
                  <span className="absolute top-1.5 right-2 h-1.5 w-1.5 rounded-full bg-[color:var(--color-danger)]" />
                </button>
                <div className="hidden sm:flex items-center gap-2 rounded-full bg-[color:var(--color-surface-2)] px-2 py-1">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-white text-[11px] font-bold">
                    {displayName.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="pr-1 min-w-0">
                    <div className="text-[12px] font-semibold truncate max-w-[140px]">{displayName}</div>
                    {approvalStatus && approvalStatus !== 'APPROVED' && (
                      <div className="text-[9.5px] uppercase tracking-[0.14em] text-[color:var(--color-warning)]">
                        {approvalStatus.toLowerCase()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="px-4 lg:px-8 py-6 lg:py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ─── inline icons (no extra deps) ─────────────────────────────────────

function IconGrid()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>; }
function IconList()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>; }
function IconBox()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M21 8L12 3L3 8v8l9 5l9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v9"/></svg>; }
function IconCash()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>; }
function IconCog()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1.03 1.55V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.8.3l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.55-1.03H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.3-1.8l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1.03-1.55V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1.03 1.55 1.7 1.7 0 0 0 1.8-.3l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.3 1.8V9c.34.69.96 1.18 1.65 1.18H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.03z"/></svg>; }
function IconStore()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l1.5-5h15L21 9v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V9z"/><path d="M5 11v9h14v-9"/></svg>; }
function IconGlobe()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18"/></svg>; }
function IconChat()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M21 12a8 8 0 1 1-15-3.7L4 21l5.7-2A8 8 0 0 1 21 12z"/></svg>; }
function IconExit()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>; }
function IconMenu()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>; }
function IconSearch()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>; }
function IconBell()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>; }
function IconChevron() { return <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 4.5L6 7.5L9 4.5"/></svg>; }

function labelForSurface(s: string): string {
  switch (s) {
    case 'vendor':      return 'Vendor portal';
    case 'admin':       return 'Admin portal';
    case 'rider':       return 'Rider app';
    case 'curator':     return 'Curator queue';
    case 'helpdesk':    return 'Helpdesk';
    case 'super-admin': return 'Super admin';
    default:            return 'Portal';
  }
}
