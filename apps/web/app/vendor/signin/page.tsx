import { redirect } from 'next/navigation';
import { getVendorSession } from '@/lib/vendor-session';
import { VendorSignInClient } from './signin-client';

export const dynamic = 'force-dynamic';

export default async function VendorSignInPage() {
  const session = await getVendorSession();
  if (session) redirect('/vendor');
  return <VendorSignInClient />;
}
