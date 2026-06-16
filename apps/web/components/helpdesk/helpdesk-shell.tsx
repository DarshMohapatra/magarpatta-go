import type { ReactNode } from 'react';
import { PartnerShell, Icons, type NavItem } from '@/components/partner/partner-shell';

const NAV: NavItem[] = [
  { href: '/helpdesk',          label: 'Queue',    icon: <Icons.Chat /> },
  { href: '/helpdesk/resolved', label: 'Resolved', icon: <Icons.List /> },
];

/**
 * Helpdesk-agent portal shell. Dark sidebar + topbar via PartnerShell.
 * Nav scoped to the two helpdesk surfaces — open queue + resolved tickets.
 */
export function HelpdeskShell({ name, children }: { name: string; children: ReactNode }) {
  return (
    <PartnerShell
      surface="helpdesk"
      navItems={NAV}
      sessionEndpoint="/api/helpdesk/session"
      signinHref="/helpdesk/signin"
      displayName={name}
    >
      {children}
    </PartnerShell>
  );
}
