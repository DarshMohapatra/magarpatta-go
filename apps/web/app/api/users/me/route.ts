import { NextResponse } from 'next/server';
import { getCustomerScope } from '@/lib/customer-scope';
import { getBuilding, isVerifiedAddress, validateFlat } from '@/lib/societies';

export async function GET() {
  const scope = await getCustomerScope();
  if (!scope) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  // findFirst with empty where: wrapper rewrites to `{ id: <session userId> }`.
  const user = await scope.db.user.findFirst({
    where: {},
    include: { addresses: { orderBy: { createdAt: 'desc' } } },
  });

  return NextResponse.json({
    ok: true,
    user: user ?? { phone: scope.session.phone, name: null, addresses: [] },
  });
}

export async function POST(req: Request) {
  const scope = await getCustomerScope();
  if (!scope) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { db } = scope;

  try {
    const { name, society, building, flat } = await req.json();

    if (name !== undefined && typeof name !== 'string') {
      return NextResponse.json({ ok: false, error: 'Invalid name' }, { status: 400 });
    }

    if (society && building) {
      const b = getBuilding(society, building);
      if (!b) {
        return NextResponse.json(
          { ok: false, error: `Unknown building "${building}" in ${society}` },
          { status: 400 },
        );
      }

      if (flat) {
        const v = validateFlat(String(flat), b);
        if (!v.ok) {
          return NextResponse.json(
            { ok: false, error: v.reason, hint: v.hint },
            { status: 400 },
          );
        }
      }
    }

    // db.user.update enforces id = session userId via the wrapper.
    await db.user.update({
      where: { id: scope.userId },
      data: { name: name ?? undefined },
    });

    if (society && building && flat) {
      const verified = isVerifiedAddress(society, building);
      // db.userAddress.upsert injects userId into both `where` and `create`.
      const created = await db.userAddress.upsert({
        where: {
          userId_society_building_flat: {
            userId: scope.userId,
            society,
            building,
            flat: String(flat),
          },
        },
        create: {
          // userId redundantly listed for the type system — wrapper would
          // override anything else the caller put here.
          userId: scope.userId,
          label: 'HOME',
          society,
          building,
          flat: String(flat),
          verified,
          isDefault: true,
        },
        update: { verified, isDefault: true },
      });

      // Demote other addresses for this user (wrapper auto-scopes the where).
      await db.userAddress.updateMany({
        where: { NOT: { id: created.id } },
        data: { isDefault: false },
      });
    }

    const refreshed = await db.user.findFirst({
      where: {},
      include: { addresses: { orderBy: { createdAt: 'desc' } } },
    });

    return NextResponse.json({ ok: true, user: refreshed });
  } catch (e) {
    console.error('[users/me] POST failed:', e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message || 'Bad request' },
      { status: 400 },
    );
  }
}
