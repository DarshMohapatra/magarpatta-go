import type { ReactNode } from 'react';
import { PartnerShell } from '@/components/partner/partner-shell';

/**
 * Thin delegate to the unified dark `PartnerShell`. Kept at this path so
 * every existing `<AdminShell>` call-site continues to work without an
 * import change. The shell's sidebar is intentionally narrowed to the 4
 * Lovable-spec primary surfaces (Ops dashboard, Vendor approvals,
 * Townships, Helpdesk); deeper admin pages (riders, finance, KB, etc.)
 * remain reachable via direct URLs and still render inside this shell.
 */
export function AdminShell({
  name,
  role,
  children,
}: {
  name: string;
  role: string;
  children: ReactNode;
}) {
  return (
    <PartnerShell surface="admin" displayName={name} approvalStatus={role}>
      {children}
    </PartnerShell>
  );
}
