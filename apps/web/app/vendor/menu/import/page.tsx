import { redirect } from 'next/navigation';
import { getVendorSession } from '@/lib/vendor-session';
import { prisma } from '@/lib/prisma';
import { VendorShell } from '@/components/vendor/vendor-shell';
import { MenuImportClient } from './import-client';

export const dynamic = 'force-dynamic';

export default async function VendorMenuImportPage() {
  const s = await getVendorSession();
  if (!s) redirect('/vendor/signin');
  const categories = await prisma.category.findMany({ orderBy: { order: 'asc' } });
  return (
    <VendorShell shopName={s.shopName} approvalStatus={s.approvalStatus}>
      <MenuImportClient
        approvalStatus={s.approvalStatus}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
      />
    </VendorShell>
  );
}
