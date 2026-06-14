import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';
import { AdminShell } from '@/components/admin/admin-shell';
import { TranslationsClient, type ProductRow } from './translations-client';

export const dynamic = 'force-dynamic';

/**
 * Catalog translations editor. Every product is a row with three inline
 * inputs (EN / HI / MR); admin types in the missing language(s) and the
 * row autosaves on blur via PATCH /api/admin/translations/[id].
 *
 * Top of page has a "Apply seed translations" button — one-shot POST that
 * fills the launch catalog's Hindi + Marathi names from a hardcoded
 * dictionary, so admin can test the customer language toggle without
 * typing each row manually.
 */
export default async function AdminTranslationsPage() {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/signin');

  const products = await prisma.product.findMany({
    where: { inStock: true },
    orderBy: [{ category: { order: 'asc' } }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      nameHi: true,
      nameMr: true,
      nameSourceLang: true,
      vendor: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  const rows: ProductRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    nameHi: p.nameHi,
    nameMr: p.nameMr,
    nameSourceLang: p.nameSourceLang,
    vendorName: p.vendor.name,
    categoryName: p.category.name,
  }));

  const canEdit = admin.role === 'SUPER_ADMIN' || admin.role === 'OPS';
  return (
    <AdminShell name={admin.name} role={admin.role}>
      <TranslationsClient rows={rows} canEdit={canEdit} />
    </AdminShell>
  );
}
