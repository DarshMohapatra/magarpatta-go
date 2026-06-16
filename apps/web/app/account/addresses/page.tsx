import { redirect } from 'next/navigation';
import { getCustomerScope } from '@/lib/customer-scope';
import { CartDrawer } from '@/components/cart-drawer';
import { MobileShell } from '@/components/customer/mobile-shell';
import { TopBar } from '@/components/customer/top-bar';
import { getServerSession } from '@/lib/session';
import { MAGARPATTA_SOCIETIES } from '@/lib/societies';
import { AddressesClient } from './addresses-client';

export const dynamic = 'force-dynamic';

export default async function AddressesPage({ searchParams }: { searchParams: Promise<{ return?: string }> }) {
  const scope = await getCustomerScope();
  if (!scope) redirect('/signin?redirect=/account/addresses');

  const sp = await searchParams;
  const returnTo = typeof sp.return === 'string' ? sp.return : null;

  // Fetch fresh from DB; wrapper auto-applies userId so we never see another
  // customer's addresses even if a future bug rewrites this query.
  const addresses = await scope.db.userAddress.findMany({
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  // Pass only the columns the client actually renders.
  const initial = addresses.map((a) => ({
    id: a.id,
    label: a.label,
    society: a.society,
    building: a.building,
    flat: a.flat,
    verified: a.verified,
    isDefault: a.isDefault,
  }));

  const societies = MAGARPATTA_SOCIETIES.map((s) => ({
    name: s.name,
    buildings: s.buildings.map((b) => ({ name: b.name, floors: b.floors, flatsPerFloor: b.flatsPerFloor })),
  }));

  const session = await getServerSession();
  return (
    <>
    <MobileShell topBar={<TopBar session={session} />}>
      <AddressesClient initial={initial} societies={societies} returnTo={returnTo} />
    </MobileShell>
    <CartDrawer />
    </>
  );
}
