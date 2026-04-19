import { Navbar } from '@/components/navbar';
import { Hero } from '@/components/hero';
import { HowItWorks } from '@/components/how-it-works';
import { Categories } from '@/components/categories';
import { WhyMagarpatta } from '@/components/why-magarpatta';
import { FreshDrops } from '@/components/fresh-drops';
import { Partners } from '@/components/partners';
import { WaitlistCta } from '@/components/cta-waitlist';
import { Footer } from '@/components/footer';
import { LiveOrders } from '@/components/live-orders';

export default function Home() {
  return (
    <main className="relative z-10">
      <Navbar />
      <Hero />
      <Partners />
      <HowItWorks />
      <Categories />
      <FreshDrops />
      <WhyMagarpatta />
      <WaitlistCta />
      <Footer />
      <LiveOrders />
    </main>
  );
}
