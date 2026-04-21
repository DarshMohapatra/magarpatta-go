import { NavbarWithSession } from '@/components/navbar-with-session';
import { Hero } from '@/components/hero';
import { HowItWorks } from '@/components/how-it-works';
import { Categories } from '@/components/categories';
import { WhyMagarpatta } from '@/components/why-magarpatta';
import { FreshDrops } from '@/components/fresh-drops';
import { Partners } from '@/components/partners';
import { WaitlistCta } from '@/components/cta-waitlist';
import { Footer } from '@/components/footer';
import { LiveOrders } from '@/components/live-orders';
import { CartDrawer } from '@/components/cart-drawer';

export const metadata = {
  title: 'Magarpatta Go — Home',
  description: 'Food, groceries, medicines and more — sourced and delivered within Magarpatta City, Pune. Under 25 minutes.',
};

export default async function HomePage() {
  return (
    <main className="relative z-10">
      <NavbarWithSession />
      <Hero />
      <Partners />
      <HowItWorks />
      <Categories />
      <FreshDrops />
      <WhyMagarpatta />
      <WaitlistCta />
      <Footer />
      <LiveOrders />
      <CartDrawer />
    </main>
  );
}
