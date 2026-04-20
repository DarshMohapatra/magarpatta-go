import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getBuilding, validateFlat } from '@/lib/societies';

async function getPhoneFromSession(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get('mg_session')?.value;
  if (!token) return null;
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    return decoded.phone ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const phone = await getPhoneFromSession();
  if (!phone) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { phone },
    include: { addresses: { orderBy: { createdAt: 'desc' } } },
  });

  return NextResponse.json({
    ok: true,
    user: user ?? { phone, name: null, addresses: [] },
  });
}

export async function POST(req: Request) {
  const phone = await getPhoneFromSession();
  if (!phone) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

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

    const user = await prisma.user.upsert({
      where: { phone },
      create: { phone, name: name ?? undefined },
      update: { name: name ?? undefined },
    });

    if (society && building && flat) {
      await prisma.userAddress.upsert({
        where: {
          userId_society_building_flat: {
            userId: user.id,
            society,
            building,
            flat: String(flat),
          },
        },
        create: {
          userId: user.id,
          society,
          building,
          flat: String(flat),
          isDefault: true,
        },
        update: { isDefault: true },
      });

      // Demote other addresses for this user.
      await prisma.userAddress.updateMany({
        where: {
          userId: user.id,
          NOT: { society, building, flat: String(flat) },
        },
        data: { isDefault: false },
      });
    }

    const refreshed = await prisma.user.findUnique({
      where: { id: user.id },
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
