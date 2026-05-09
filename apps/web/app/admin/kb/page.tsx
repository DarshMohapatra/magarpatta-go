import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-session';
import { AdminShell } from '@/components/admin/admin-shell';
import { AdminKbClient } from './kb-client';

export const dynamic = 'force-dynamic';

export default async function AdminKbPage() {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/signin');
  return (
    <AdminShell name={admin.name} role={admin.role}>
      <AdminKbClient />
    </AdminShell>
  );
}
