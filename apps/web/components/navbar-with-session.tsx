import { getServerSession, type SessionUser } from '@/lib/session';
import { Navbar } from './navbar';

export type InitialSession = SessionUser | null;

/**
 * Server component wrapper: reads the session cookie and hydrates the user
 * profile from Postgres in one server round-trip, then renders the client
 * Navbar with that data as a prop. No client fetch flash on first paint.
 */
export async function NavbarWithSession() {
  const session = await getServerSession();
  return <Navbar initialSession={session} />;
}
