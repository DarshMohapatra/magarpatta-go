import { redirect } from 'next/navigation';
import { getVendorSession } from '@/lib/vendor-session';
import { VendorShell } from '@/components/vendor/vendor-shell';
import { VendorCampaignsClient } from './campaigns-client';

export const dynamic = 'force-dynamic';

export default async function VendorCampaignsPage() {
  const s = await getVendorSession();
  if (!s) redirect('/vendor/signin');
  return (
    <VendorShell shopName={s.shopName} approvalStatus={s.approvalStatus}>
      <VendorCampaignsClient approvalStatus={s.approvalStatus} />
    </VendorShell>
  );
}
