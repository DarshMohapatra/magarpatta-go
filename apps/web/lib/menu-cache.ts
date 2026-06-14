import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';
import { getActiveDiscounts } from './active-discounts';
import { getAllowedCategorySlugs } from './settings';

/**
 * Cached read layer for the public menu.
 *
 * `unstable_cache` keeps the same DB result hot across requests for the TTL
 * below, so two customers loading /menu within 30s share one DB roundtrip.
 * Mutations (admin approve, vendor stock toggle, etc.) call
 * `revalidateTag('menu')` to clear it.
 *
 * The category whitelist (`catalog_allowed_categories` site setting) is
 * applied AFTER the cached read so its changes go live without a stale
 * cache window — readers below filter on each call. Default whitelist is
 * `['produce']` at Phase-1 launch.
 */

const TTL = 30;

const getMenuCategoriesRaw = unstable_cache(
  async () => prisma.category.findMany({
    orderBy: { order: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      // i18n columns surface to the customer-facing section headers / pills.
      nameHi: true,
      nameMr: true,
      glyph: true,
      _count: { select: { products: { where: { inStock: true } } } },
    },
  }),
  // v2 bump after adding nameHi/nameMr to the projected shape — old payloads
  // would be missing the i18n columns.
  ['menu-categories-v2'],
  { revalidate: TTL, tags: ['menu', 'categories'] },
);

export async function getMenuCategories() {
  const [cats, allowed] = await Promise.all([getMenuCategoriesRaw(), getAllowedCategorySlugs()]);
  if (allowed.length === 0) return cats;
  const set = new Set(allowed);
  return cats.filter((c) => set.has(c.slug));
}

export const getVendorBySlug = unstable_cache(
  async (slug: string) => prisma.vendor.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, name: true, hub: true, accent: true, tags: true,
      description: true, rating: true, etaMinutes: true, costForTwo: true,
    },
  }),
  ['vendor-by-slug'],
  { revalidate: TTL, tags: ['menu', 'vendors'] },
);

const getVendorProductsRaw = unstable_cache(
  async (vendorId: string) => prisma.product.findMany({
    where: { vendorId, inStock: true },
    orderBy: [{ category: { order: 'asc' } }, { name: 'asc' }],
    include: {
      category: { select: { name: true, slug: true, order: true } },
      vendor: { select: { id: true, slug: true, name: true, hub: true } },
    },
  }),
  ['vendor-products'],
  { revalidate: TTL, tags: ['menu', 'products'] },
);

export async function getVendorProducts(vendorId: string) {
  const [rows, allowed] = await Promise.all([getVendorProductsRaw(vendorId), getAllowedCategorySlugs()]);
  if (allowed.length === 0) return rows;
  const set = new Set(allowed);
  return rows.filter((p) => set.has(p.category.slug));
}

const getRestaurantIndexRaw = unstable_cache(
  async () => prisma.vendor.findMany({
    where: { active: true },
    orderBy: [{ rating: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      hub: true,
      description: true,
      accent: true,
      vendorType: true,
      tags: true,
      rating: true,
      etaMinutes: true,
      costForTwo: true,
      isWholesale: true,
      products: {
        where: { inStock: true },
        orderBy: { priceInr: 'desc' },
        take: 3,
        select: {
          id: true, name: true, imageUrl: true, accent: true, priceInr: true, mrpInr: true,
          category: { select: { slug: true } },
        },
      },
      _count: { select: { products: { where: { inStock: true } } } },
    },
  }),
  // v4 bump: Category + Product gained i18n + weight columns. Old cached
  // payloads don't carry nameHi/nameMr/soldByWeight/estimatedGrams.
  ['restaurant-index-v4'],
  { revalidate: TTL, tags: ['menu', 'vendors'] },
);

export async function getRestaurantIndex() {
  const [rows, allowed] = await Promise.all([getRestaurantIndexRaw(), getAllowedCategorySlugs()]);
  if (allowed.length === 0) return rows;
  const set = new Set(allowed);
  // Filter every vendor's preview products to the whitelist; drop vendors
  // whose entire preview falls outside the whitelist so the index page
  // doesn't show empty-shop cards.
  return rows
    .map((v) => ({ ...v, products: v.products.filter((p) => p.category && set.has(p.category.slug)) }))
    .filter((v) => v.products.length > 0);
}

const getAllInStockProductsRaw = unstable_cache(
  async () => prisma.product.findMany({
    // Match the catalog API: an item is candidate-visible when its master
    // is in stock OR a vendor daily-override exists. The override resolver
    // is the final authority on what reaches the customer.
    where: {
      OR: [
        { inStock: true },
        { dailyOverrides: { some: {} } },
      ],
    },
    orderBy: [{ category: { order: 'asc' } }, { name: 'asc' }],
    include: {
      vendor: { select: { id: true, slug: true, name: true, hub: true, isWholesale: true } },
      category: { select: { slug: true, name: true } },
    },
  }),
  ['all-in-stock-products-v2'],
  { revalidate: TTL, tags: ['menu', 'products'] },
);

export async function getAllInStockProducts() {
  const [rows, allowed] = await Promise.all([getAllInStockProductsRaw(), getAllowedCategorySlugs()]);
  if (allowed.length === 0) return rows;
  const set = new Set(allowed);
  return rows.filter((p) => set.has(p.category.slug));
}

// Re-export so consumers don't have to import from two places.
export { getActiveDiscounts };
