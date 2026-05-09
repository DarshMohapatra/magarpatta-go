import 'server-only';
import { cache } from 'react';
import { prisma } from './prisma';
import { getServerSession, type SessionUser } from './session';
import { getCustomerPrisma, type CustomerPrisma } from './customer-db';

export interface CustomerScope {
  session: SessionUser;
  userId: string;
  /**
   * A Prisma client extended so every customer-data query is forced to
   * filter by `userId`. Use this — never the raw `prisma` import — for any
   * order / userAddress / orderFeedback / user read or write inside
   * customer-facing routes and pages.
   */
  db: CustomerPrisma;
}

/**
 * Resolve the customer scope for the current request. Returns null if there
 * is no signed-in customer, or if the session cookie's phone doesn't match
 * any user (orphaned cookie). Cached per-request via React `cache()` so
 * multiple callers share one DB lookup.
 *
 * Routes: branch on the null and return a 401.
 *   const scope = await getCustomerScope();
 *   if (!scope) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
 *
 * Pages: redirect on null.
 *   const scope = await getCustomerScope();
 *   if (!scope) redirect('/signin');
 */
export const getCustomerScope = cache(async function getCustomerScope(): Promise<CustomerScope | null> {
  const session = await getServerSession();
  if (!session) return null;

  // Bootstrap: we need the userId before we can build the scoped client.
  // This is the ONE place customer code talks to raw `prisma` — it's a
  // single read keyed on the session phone, no IDOR surface.
  const user = await prisma.user.findUnique({
    where: { phone: session.phone },
    select: { id: true },
  });
  if (!user) return null;

  return {
    session,
    userId: user.id,
    db: getCustomerPrisma(user.id),
  };
});
