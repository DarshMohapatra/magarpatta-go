import { redirect } from 'next/navigation';
import { getCustomerScope } from '@/lib/customer-scope';
import { getCodEligibility } from '@/lib/cod';
import { NavbarWithSession } from '@/components/navbar-with-session';
import { Footer } from '@/components/footer';
import { CartDrawer } from '@/components/cart-drawer';
import { CheckoutClient } from './checkout-client';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const scope = await getCustomerScope();
  if (!scope) redirect('/signin');

  const cod = await getCodEligibility(scope.db);

  return (
    <main className="relative z-10 min-h-screen">
      <NavbarWithSession />
      <CheckoutClient
        session={{
          phone: scope.session.phone,
          name: scope.session.name,
          addresses: scope.session.addresses,
        }}
        cod={{ eligible: cod.eligible, maxOrderInr: cod.maxOrderInr }}
      />
      <Footer />
      <CartDrawer />
    </main>
  );
}
