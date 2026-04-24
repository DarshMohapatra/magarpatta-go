import { redirect } from 'next/navigation';
import { getVendorSession } from '@/lib/vendor-session';
import { VendorShell } from '@/components/vendor/vendor-shell';
import { VendorOrdersClient } from './orders-client';

export const dynamic = 'force-dynamic';

export default async function VendorOrdersPage() {
  const s = await getVendorSession();
  if (!s) redirect('/vendor/signin');
  return (
    <VendorShell shopName={s.shopName} approvalStatus={s.approvalStatus}>
      <VendorOrdersClient approvalStatus={s.approvalStatus} />
    </VendorShell>
  );
}
