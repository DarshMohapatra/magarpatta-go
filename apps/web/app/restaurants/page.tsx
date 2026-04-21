import { prisma } from '@/lib/prisma';
import { NavbarWithSession } from '@/components/navbar-with-session';
import { Footer } from '@/components/footer';
import { CartDrawer } from '@/components/cart-drawer';
import { RestaurantsClient, type VendorRow } from './restaurants-client';

export const dynamic = 'force-dynamic';

export default async function RestaurantsPage() {
  const vendors = await prisma.vendor.findMany({
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
  });

  const rows: VendorRow[] = vendors.map((v) => ({
    slug: v.slug,
    name: v.name,
    hub: v.hub,
    description: v.description,
    accent: v.accent ?? 'forest',
    vendorType: v.vendorType,
    tags: v.tags,
    rating: v.rating,
    etaMinutes: v.etaMinutes,
    costForTwo: v.costForTwo,
    itemCount: v._count.products,
    previews: v.products.map((p) => ({
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      accent: p.accent,
      priceInr: p.mrpInr ?? p.priceInr,
    })),
  }));

  return (
    <main className="relative z-10 min-h-screen">
      <NavbarWithSession />
      <RestaurantsClient vendors={rows} />
      <Footer />
      <CartDrawer />
    </main>
  );
}
