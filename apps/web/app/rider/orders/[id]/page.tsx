import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getRiderSession } from '@/lib/rider-session';
import { deliveryOtp } from '@/lib/orders';
import { RiderOrderClient } from './rider-order-client';

export const dynamic = 'force-dynamic';

export default async function RiderOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const rider = await getRiderSession();
  if (!rider) redirect('/rider/signin');

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) notFound();

  // Rider can only view orders they've claimed, or unclaimed PLACED orders.
  const canView =
    order.riderPhone === rider.phone ||
    (!order.riderPhone && order.status === 'PLACED');
  if (!canView) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="font-serif text-[28px]">Another rider is on this one.</h1>
          <p className="mt-2 text-[13.5px] text-[color:var(--color-ink-soft)]">Head back and grab the next available order.</p>
          <Link href="/rider" className="mt-6 inline-block rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-3 text-[13.5px] font-medium hover:bg-[color:var(--color-forest-dark)]">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <RiderOrderClient
      rider={rider}
      expectedOtp={deliveryOtp(order.id)}
      order={{
        id: order.id,
        status: order.status,
        placedAt: order.placedAt.toISOString(),
        acceptedAt: order.acceptedAt?.toISOString() ?? null,
        pickedUpAt: order.pickedUpAt?.toISOString() ?? null,
        deliveredAt: order.deliveredAt?.toISOString() ?? null,
        totalInr: order.totalInr,
        paymentMethod: order.paymentMethod,
        society: order.society,
        building: order.building,
        flat: order.flat,
        vendorName: order.vendorName,
        vendorHub: order.vendorHub,
        notes: order.notes,
        riderPhone: order.riderPhone,
        items: order.items.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          mrpInr: i.mrpInr,
          priceInr: i.priceInr,
        })),
      }}
    />
  );
}
