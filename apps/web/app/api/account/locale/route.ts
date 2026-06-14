import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/session';
import { asLocale } from '@/lib/i18n';
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from '@/lib/locale';

/**
 * Set the customer's preferred display language. Writes the cookie (always)
 * AND mirrors to User.locale when signed in, so the choice follows the
 * customer across devices on next sign-in.
 *
 * Cookie-first, DB-second is intentional — guests get the locale toggle
 * working without an account, and the server-side pickName helpers read
 * the cookie too.
 */
export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { locale?: string };
  const locale = asLocale(body.locale);

  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: 'lax',
  });

  // Best-effort persist to the user row. Anonymous visitors just get the
  // cookie — nothing else to do.
  const session = await getServerSession();
  if (session) {
    await prisma.user
      .update({ where: { phone: session.phone }, data: { locale } })
      .catch(() => { /* race with concurrent updates — cookie is authoritative anyway */ });
  }

  return NextResponse.json({ ok: true, locale });
}
