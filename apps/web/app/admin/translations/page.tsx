import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';
import { getAllowedCategorySlugs } from '@/lib/settings';
import { AdminShell } from '@/components/admin/admin-shell';
import { TranslationsClient, type ProductRow } from './translations-client';

export const dynamic = 'force-dynamic';

/**
 * Catalog translations editor. Scoped to the categories currently in the
 * admin catalog whitelist (Settings → Catalog whitelist), so admin only
 * sees products that are actually customer-visible. Add more categories
 * to the whitelist and they'll automatically appear here too.
 *
 * Each product is a row with three inline inputs (EN / HI / MR); rows
 * autosave on blur via PATCH /api/admin/translations/[id].
 *
 * Top of page has an "Apply seed translations" button — one-shot POST
 * that fills launch-catalog items from a curated dictionary so admin can
 * verify the customer language toggle without typing each row manually.
 */
export default async function AdminTranslationsPage() {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/signin');

  const allowedSlugs = await getAllowedCategorySlugs();
  const products = await prisma.product.findMany({
    where: {
      inStock: true,
      // Empty whitelist = no filter (show everything). Non-empty whitelist
      // = only those categories — matches what customers can see.
      ...(allowedSlugs.length > 0 ? { category: { slug: { in: allowedSlugs } } } : {}),
    },
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
      <TranslationsClient rows={rows} canEdit={canEdit} scopedCategorySlugs={allowedSlugs} />
    </AdminShell>
  );
}
