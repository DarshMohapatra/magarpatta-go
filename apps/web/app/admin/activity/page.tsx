import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-session';
import { AdminShell } from '@/components/admin/admin-shell';
import { AdminActivityClient } from './activity-client';

export const dynamic = 'force-dynamic';

export default async function AdminActivityPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/signin');
  const { role } = await searchParams;
  return (
    <AdminShell name={admin.name} role={admin.role}>
      <AdminActivityClient initialRole={role ?? ''} />
    </AdminShell>
  );
}
