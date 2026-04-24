import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-session';
import { AdminShell } from '@/components/admin/admin-shell';
import { AdminCustomersClient } from './customers-client';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/signin');
  return (
    <AdminShell name={admin.name} role={admin.role}>
      <AdminCustomersClient />
    </AdminShell>
  );
}
