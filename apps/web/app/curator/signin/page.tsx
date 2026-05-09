import { redirect } from 'next/navigation';
import { getCuratorSession } from '@/lib/curator-session';
import { CuratorSignInClient } from './signin-client';

export const dynamic = 'force-dynamic';

export default async function CuratorSignInPage() {
  const curator = await getCuratorSession();
  if (curator) redirect('/curator');
  return <CuratorSignInClient />;
}
