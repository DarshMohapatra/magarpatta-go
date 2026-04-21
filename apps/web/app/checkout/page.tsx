import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session';
import { NavbarWithSession } from '@/components/navbar-with-session';
import { Footer } from '@/components/footer';
import { CartDrawer } from '@/components/cart-drawer';
import { CheckoutClient } from './checkout-client';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const session = await getServerSession();
  if (!session) redirect('/signin');

  return (
    <main className="relative z-10 min-h-screen">
      <NavbarWithSession />
      <CheckoutClient
        session={{
          phone: session.phone,
          name: session.name,
          society: session.society,
          building: session.building,
          flat: session.flat,
        }}
      />
      <Footer />
      <CartDrawer />
    </main>
  );
}
