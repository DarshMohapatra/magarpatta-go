import { redirect } from 'next/navigation';
import { getHelpdeskSession } from '@/lib/helpdesk-session';
import { HelpdeskShell } from '@/components/helpdesk/helpdesk-shell';
import { HelpdeskQueueClient } from '../queue-client';

export const dynamic = 'force-dynamic';

export default async function HelpdeskResolvedPage() {
  const agent = await getHelpdeskSession();
  if (!agent) redirect('/helpdesk/signin');
  return (
    <HelpdeskShell name={agent.name}>
      <HelpdeskQueueClient scope="resolved" />
    </HelpdeskShell>
  );
}
