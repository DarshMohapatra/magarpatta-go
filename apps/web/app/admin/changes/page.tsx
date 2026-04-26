import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-session';
import { AdminShell } from '@/components/admin/admin-shell';
import { AdminChangesClient } from './changes-client';

export const dynamic = 'force-dynamic';

export default async function AdminChangesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/signin');
  const { status } = await searchParams;
  return (
    <AdminShell name={admin.name} role={admin.role}>
      <AdminChangesClient initialStatus={status ?? 'PENDING'} />
    </AdminShell>
  );
}
