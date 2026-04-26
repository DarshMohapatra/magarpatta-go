import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';
import { getActiveDiscounts } from './active-discounts';

/**
 * Cached read layer for the public menu.
 *
 * `unstable_cache` keeps the same DB result hot across requests for the TTL
 * below, so two customers loading /menu within 30s share one DB roundtrip.
 * Mutations (admin approve, vendor stock toggle, etc.) call
 * `revalidateTag('menu')` to clear it.
 */

const TTL = 30;

export const getMenuCategories = unstable_cache(
  async () => prisma.category.findMany({
    orderBy: { order: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      glyph: true,
      _count: { select: { products: { where: { inStock: true } } } },
    },
  }),
  ['menu-categories'],
  { revalidate: TTL, tags: ['menu', 'categories'] },
);

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

export const getVendorProducts = unstable_cache(
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

export const getRestaurantIndex = unstable_cache(
  async () => prisma.vendor.findMany({
    where: { active: true },
    orderBy: [{ rating: 'desc' }, { name: 'asc' }],
    include: {
      products: {
        where: { inStock: true },
        orderBy: { priceInr: 'desc' },
        take: 3,
        select: { id: true, name: true, imageUrl: true, accent: true, priceInr: true, mrpInr: true },
      },
      _count: { select: { products: { where: { inStock: true } } } },
    },
  }),
  ['restaurant-index'],
  { revalidate: TTL, tags: ['menu', 'vendors'] },
);

export const getAllInStockProducts = unstable_cache(
  async () => prisma.product.findMany({
    where: { inStock: true },
    orderBy: [{ category: { order: 'asc' } }, { name: 'asc' }],
    include: {
      vendor: { select: { id: true, slug: true, name: true, hub: true } },
      category: { select: { slug: true, name: true } },
    },
  }),
  ['all-in-stock-products'],
  { revalidate: TTL, tags: ['menu', 'products'] },
);

// Re-export so consumers don't have to import from two places.
export { getActiveDiscounts };
