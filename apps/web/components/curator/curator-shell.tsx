import type { ReactNode } from 'react';
import { PartnerShell, Icons, type NavItem } from '@/components/partner/partner-shell';

const NAV: NavItem[] = [
  { href: '/curator',         label: 'Queue',   icon: <Icons.List /> },
  { href: '/curator/history', label: 'History', icon: <Icons.Box /> },
];

/**
 * Curator portal shell. Delegates to PartnerShell for the unified dark
 * sidebar + topbar treatment, with a custom NAV scoped to curator routes.
 */
export function CuratorShell({ name, children }: { name: string; children: ReactNode }) {
  return (
    <PartnerShell
      surface="curator"
      navItems={NAV}
      sessionEndpoint="/api/curator/session"
      signinHref="/curator/signin"
      displayName={name}
    >
      {children}
    </PartnerShell>
  );
}
