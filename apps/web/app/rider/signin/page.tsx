import { redirect } from 'next/navigation';
import { getRiderSession } from '@/lib/rider-session';
import { RiderSignInClient } from './signin-client';

export const dynamic = 'force-dynamic';

export default async function RiderSignInPage() {
  const rider = await getRiderSession();
  if (rider) redirect('/rider');
  return <RiderSignInClient />;
}
