import { redirect } from 'next/navigation';
import { getHelpdeskSession } from '@/lib/helpdesk-session';
import { HelpdeskSignInClient } from './signin-client';

export const dynamic = 'force-dynamic';

export default async function HelpdeskSignInPage() {
  const agent = await getHelpdeskSession();
  if (agent) redirect('/helpdesk');
  return <HelpdeskSignInClient />;
}
