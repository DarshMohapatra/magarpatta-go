import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-session';
import { AdminShell } from '@/components/admin/admin-shell';
import { AdminSupportClient } from './support-client';

export const dynamic = 'force-dynamic';

export default async function AdminSupportPage() {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/signin');
  return (
    <AdminShell name={admin.name} role={admin.role}>
      <AdminSupportClient />
    </AdminShell>
  );
}
