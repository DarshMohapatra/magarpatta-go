import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';
import { NavbarWithSession } from '@/components/navbar-with-session';
import { Footer } from '@/components/footer';
import { CartDrawer } from '@/components/cart-drawer';
import { OrderDetailClient } from './order-detail-client';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) redirect('/signin');

  const user = await prisma.user.findUnique({ where: { phone: session.phone } });
  if (!user) notFound();

  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: { items: true },
  });
  if (!order) notFound();

  return (
    <main className="relative z-10 min-h-screen">
      <NavbarWithSession />
      <OrderDetailClient
        order={{
          id: order.id,
          status: order.status,
          placedAt: order.placedAt.toISOString(),
          vendorAcceptedAt: order.vendorAcceptedAt?.toISOString() ?? null,
          vendorReadyAt: order.vendorReadyAt?.toISOString() ?? null,
          riderAssignedAt: order.riderAssignedAt?.toISOString() ?? null,
          pickedUpAt: order.pickedUpAt?.toISOString() ?? null,
          deliveredAt: order.deliveredAt?.toISOString() ?? null,
          cancelledAt: order.cancelledAt?.toISOString() ?? null,
          riderName: order.riderName,
          fulfilmentMode: order.fulfilmentMode,
          subtotalInr: order.subtotalInr,
          convenienceInr: order.convenienceInr,
          taxInr: order.taxInr,
          addOnsInr: order.addOnsInr,
          deliveryFeeInr: order.deliveryFeeInr,
          discountInr: order.discountInr,
          couponCode: order.couponCode,
          totalInr: order.totalInr,
          giftWrap: order.giftWrap,
          insurance: order.insurance,
          society: order.society,
          building: order.building,
          flat: order.flat,
          vendorName: order.vendorName,
          vendorHub: order.vendorHub,
          paymentMethod: order.paymentMethod,
          notes: order.notes,
          items: order.items.map((i) => ({
            id: i.id,
            productId: i.productId,
            name: i.name,
            vendorName: i.vendorName,
            unit: i.unit,
            priceInr: i.priceInr,
            mrpInr: i.mrpInr,
            isRegulated: i.isRegulated,
            quantity: i.quantity,
            accent: i.accent,
            glyph: i.glyph,
            imageUrl: i.imageUrl,
          })),
        }}
      />
      <Footer />
      <CartDrawer />
    </main>
  );
}
