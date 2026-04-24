import { redirect } from 'next/navigation';
import { getVendorSession } from '@/lib/vendor-session';
import { VendorShell } from '@/components/vendor/vendor-shell';
import { VendorMenuClient } from './menu-client';

export const dynamic = 'force-dynamic';

export default async function VendorMenuPage() {
  const s = await getVendorSession();
  if (!s) redirect('/vendor/signin');
  return (
    <VendorShell shopName={s.shopName} approvalStatus={s.approvalStatus}>
      <VendorMenuClient approvalStatus={s.approvalStatus} />
    </VendorShell>
  );
}
