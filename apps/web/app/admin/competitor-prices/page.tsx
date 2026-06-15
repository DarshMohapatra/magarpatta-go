import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/admin-session';
import { getAllowedCategorySlugs } from '@/lib/settings';
import { AdminShell } from '@/components/admin/admin-shell';
import { CompetitorPricesClient, type ProductRow } from './client';
import { COMPETITOR_SOURCES, type CompetitorSource } from '@/lib/competitor-prices';
import { ensureCompetitorPricesSeeded } from '@/lib/competitor-seed';

export const dynamic = 'force-dynamic';

/**
 * Competitor-price editor. One row per product, one input cell per
 * competitor source. Autosaves on blur. Same UX shell as the translations
 * editor so admins don't have to learn a second pattern.
 *
 * Scoped to the customer-visible catalog whitelist — no point editing
 * prices on items customers can't see.
 */
export default async function AdminCompetitorPricesPage() {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/signin');

  // Lazy bootstrap so admin lands on a populated table the first time
  // they visit, instead of an empty grid that needs a manual click.
  await ensureCompetitorPricesSeeded();

  const allowedSlugs = await getAllowedCategorySlugs();
  const products = await prisma.product.findMany({
    where: {
      inStock: true,
      ...(allowedSlugs.length > 0 ? { category: { slug: { in: allowedSlugs } } } : {}),
    },
    orderBy: [{ category: { order: 'asc' } }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      priceInr: true,
      mrpInr: true,
      unit: true,
      vendor: { select: { name: true } },
      category: { select: { name: true } },
      competitorSnapshots: { select: { source: true, priceInr: true, updatedAt: true } },
    },
  });

  const rows: ProductRow[] = products.map((p) => {
    const priceBySource: Partial<Record<CompetitorSource, number>> = {};
    let latestCapturedAt: string | null = null;
    for (const s of p.competitorSnapshots) {
      // String compare is safe for the source enum — Prisma stores as text.
      if ((COMPETITOR_SOURCES as readonly string[]).includes(s.source)) {
        priceBySource[s.source as CompetitorSource] = s.priceInr;
      }
      if (!latestCapturedAt || s.updatedAt.toISOString() > latestCapturedAt) {
        latestCapturedAt = s.updatedAt.toISOString();
      }
    }
    return {
      id: p.id,
      name: p.name,
      ourPriceInr: p.mrpInr ?? p.priceInr,
      unit: p.unit ?? '',
      vendorName: p.vendor.name,
      categoryName: p.category.name,
      priceBySource,
      latestCapturedAt,
    };
  });

  const canEdit = admin.role === 'SUPER_ADMIN' || admin.role === 'OPS';
  return (
    <AdminShell name={admin.name} role={admin.role}>
      <CompetitorPricesClient
        rows={rows}
        canEdit={canEdit}
        sources={COMPETITOR_SOURCES}
        scopedCategorySlugs={allowedSlugs}
      />
    </AdminShell>
  );
}
