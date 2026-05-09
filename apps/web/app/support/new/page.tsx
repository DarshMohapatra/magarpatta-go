import { redirect } from 'next/navigation';
import { getCustomerScope } from '@/lib/customer-scope';
import { NavbarWithSession } from '@/components/navbar-with-session';
import { Footer } from '@/components/footer';
import { CartDrawer } from '@/components/cart-drawer';
import { NewTicketForm } from './new-ticket-form';

export const dynamic = 'force-dynamic';

export default async function NewTicketPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const scope = await getCustomerScope();
  if (!scope) redirect('/signin');
  const { orderId } = await searchParams;

  // Most recent 10 orders so the customer can attach one to the ticket.
  const orders = await scope.db.order.findMany({
    orderBy: { placedAt: 'desc' },
    take: 10,
    select: { id: true, vendorName: true, totalInr: true, placedAt: true, status: true },
  });

  // If the URL pre-selected an order, validate ownership before passing in.
  const preselectedOrderId = orderId && orders.some((o) => o.id === orderId) ? orderId : null;

  return (
    <main className="relative z-10 min-h-screen">
      <NavbarWithSession />
      <section className="pt-24 pb-20">
        <div className="mx-auto max-w-[720px] px-6 lg:px-10">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">New ticket</div>
          <h1 className="mt-3 font-serif text-[40px] lg:text-[52px] leading-[1.0] tracking-[-0.02em]">
            Tell us what <span className="italic text-[color:var(--color-forest)]">went wrong.</span>
          </h1>
          <p className="mt-3 text-[14px] text-[color:var(--color-ink-soft)]">
            One short headline, the category, and the details. Attach an order if it's about a specific delivery.
          </p>

          <div className="mt-8">
            <NewTicketForm orders={orders.map((o) => ({
              id: o.id,
              vendorName: o.vendorName,
              totalInr: o.totalInr,
              placedAt: o.placedAt.toISOString(),
              status: o.status,
            }))} preselectedOrderId={preselectedOrderId} />
          </div>
        </div>
      </section>
      <Footer />
      <CartDrawer />
    </main>
  );
}
