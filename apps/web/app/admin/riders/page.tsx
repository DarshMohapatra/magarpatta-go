import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-session';
import { AdminShell } from '@/components/admin/admin-shell';
import { AdminRidersClient } from './riders-client';

export const dynamic = 'force-dynamic';

export default async function AdminRidersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/signin');
  const { status } = await searchParams;
  return (
    <AdminShell name={admin.name} role={admin.role}>
      <AdminRidersClient initialStatus={status ?? 'PENDING'} />
    </AdminShell>
  );
}
