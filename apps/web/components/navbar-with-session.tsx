import { getServerSession, type SessionUser } from '@/lib/session';
import { getServerLocale } from '@/lib/locale';
import { Navbar } from './navbar';
import { CustomerNoticeBanner } from './customer-notice-banner';
import { IosInstallHint } from './ios-install-hint';

export type InitialSession = SessionUser | null;

/**
 * Server component wrapper: reads the session cookie + locale cookie and
 * hydrates the user profile from Postgres in one server round-trip, then
 * renders the client Navbar with that data as props. No client fetch flash
 * on first paint.
 *
 * Also renders the admin-broadcast customer notice banner (when active) so
 * every customer page gets it for free, without each page having to remember
 * to include the component.
 */
export async function NavbarWithSession() {
  const [session, locale] = await Promise.all([getServerSession(), getServerLocale()]);
  return (
    <>
      <CustomerNoticeBanner />
      <Navbar initialSession={session} initialLocale={locale} />
      <IosInstallHint />
    </>
  );
}
