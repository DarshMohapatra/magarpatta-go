import { redirect } from 'next/navigation';
import { getVendorSession } from '@/lib/vendor-session';
import { VendorShell } from '@/components/vendor/vendor-shell';
import { VendorPayoutsClient } from './payouts-client';

export const dynamic = 'force-dynamic';

export default async function VendorPayoutsPage() {
  const s = await getVendorSession();
  if (!s) redirect('/vendor/signin');
  return (
    <VendorShell shopName={s.shopName} approvalStatus={s.approvalStatus}>
      <VendorPayoutsClient />
    </VendorShell>
  );
}
