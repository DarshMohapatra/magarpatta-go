import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-session';
import { AdminSignInClient } from './signin-client';

export const dynamic = 'force-dynamic';

export default async function AdminSignInPage() {
  const admin = await getAdminSession();
  if (admin) redirect('/admin');
  return <AdminSignInClient />;
}
