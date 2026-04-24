import { redirect } from 'next/navigation';
import { getRiderSession } from '@/lib/rider-session';
import { RiderRegisterClient } from './register-client';

export const dynamic = 'force-dynamic';

export default async function RiderRegisterPage() {
  const session = await getRiderSession();
  if (session) redirect('/rider');
  return <RiderRegisterClient />;
}
