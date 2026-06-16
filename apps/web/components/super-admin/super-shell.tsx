import type { ReactNode } from 'react';
import { PartnerShell, Icons, type NavItem } from '@/components/partner/partner-shell';

const NAV: NavItem[] = [
  { href: '/super-admin', label: 'Overview', icon: <Icons.Globe /> },
];

/**
 * Super-admin (cross-instance multi-site) shell. Dark sidebar + topbar via
 * PartnerShell. Single-item nav for now; expands as more cross-instance
 * surfaces (sites roster, global activity, deploy controls) come online.
 */
export function SuperShell({ phone, children }: { phone: string; children: ReactNode }) {
  return (
    <PartnerShell
      surface="super-admin"
      navItems={NAV}
      sessionEndpoint="/api/super-admin/session"
      signinHref="/super-admin/signin"
      displayName={`+91 ${phone}`}
    >
      {children}
    </PartnerShell>
  );
}
