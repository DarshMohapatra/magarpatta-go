import type { ReactNode } from 'react';
import { PartnerShell } from '@/components/partner/partner-shell';

/**
 * Thin delegate to the unified dark `PartnerShell`. Kept at this path so
 * every existing `<VendorShell>` call-site continues to work without an
 * import change.
 */
export function VendorShell({
  shopName,
  approvalStatus,
  children,
}: {
  shopName: string;
  approvalStatus: string;
  children: ReactNode;
}) {
  return (
    <PartnerShell surface="vendor" displayName={shopName} approvalStatus={approvalStatus}>
      {children}
    </PartnerShell>
  );
}
