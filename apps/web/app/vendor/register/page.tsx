import { redirect } from 'next/navigation';
import { getVendorSession } from '@/lib/vendor-session';
import { VendorRegisterClient } from './register-client';

export const dynamic = 'force-dynamic';

export default async function VendorRegisterPage() {
  const session = await getVendorSession();
  if (session) redirect('/vendor');
  return <VendorRegisterClient />;
}
