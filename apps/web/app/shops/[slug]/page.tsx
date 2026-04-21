import { redirect } from 'next/navigation';

export default async function ShopSlugRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/restaurants/${slug}`);
}
