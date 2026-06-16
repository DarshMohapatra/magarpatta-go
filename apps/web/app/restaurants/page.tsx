import { Suspense } from 'react';
import { CartDrawer } from '@/components/cart-drawer';
import { MobileShell } from '@/components/customer/mobile-shell';
import { TopBar } from '@/components/customer/top-bar';
import { getServerSession } from '@/lib/session';
import { RestaurantsClient, type VendorRow } from './restaurants-client';
import { getRestaurantIndex } from '@/lib/menu-cache';
import { getWholesaleOnlyMode } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function RestaurantsPage() {
  const session = await getServerSession();
  return (
    <>
    <MobileShell topBar={<TopBar session={session} />}>
      <Suspense fallback={<RestaurantsSkeleton />}>
        <RestaurantsList />
      </Suspense>
    </MobileShell>
    <CartDrawer />
    </>
  );
}

async function RestaurantsList() {
  const [vendorsRaw, wholesaleOnly] = await Promise.all([
    getRestaurantIndex(),
    getWholesaleOnlyMode(),
  ]);
  const vendors = wholesaleOnly ? vendorsRaw.filter((v) => v.isWholesale) : vendorsRaw;
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
  return <RestaurantsClient vendors={rows} />;
}

function RestaurantsSkeleton() {
  return (
    <section className="pt-24 pb-16">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="h-12 w-72 rounded-md bg-[color:var(--color-foreground)]/8 mb-3 animate-pulse" />
        <div className="h-4 w-96 rounded-full bg-[color:var(--color-foreground)]/6 mb-10" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-2xl border border-[color:var(--color-foreground)]/8 bg-[color:var(--color-surface)] overflow-hidden">
              <div className="h-40 bg-[color:var(--color-foreground)]/6 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-6 w-2/3 rounded-md bg-[color:var(--color-foreground)]/8" />
                <div className="h-3 w-1/2 rounded-full bg-[color:var(--color-foreground)]/6" />
                <div className="h-3 w-3/4 rounded-full bg-[color:var(--color-foreground)]/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
