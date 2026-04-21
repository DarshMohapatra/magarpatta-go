import { redirect } from 'next/navigation';
import { getRiderSession } from '@/lib/rider-session';
import { RiderDashboardClient } from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function RiderHome() {
  const rider = await getRiderSession();
  if (!rider) redirect('/rider/signin');
  return <RiderDashboardClient rider={rider} />;
}
