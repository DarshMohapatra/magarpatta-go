import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-session';
import { AdminShell } from '@/components/admin/admin-shell';
import { AdminOrdersClient } from './orders-client';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/signin');
  return (
    <AdminShell name={admin.name} role={admin.role}>
      <AdminOrdersClient />
    </AdminShell>
  );
}
