import { NextResponse } from 'next/server';
import type { AddressLabel } from '@prisma/client';
import { getCustomerScope } from '@/lib/customer-scope';
import { getBuilding, isVerifiedAddress, validateFlat } from '@/lib/societies';

const VALID_LABELS = new Set<AddressLabel>(['HOME', 'WORK', 'OTHER']);

export async function GET() {
  const scope = await getCustomerScope();
  if (!scope) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  // Wrapper auto-applies userId — empty where is safe.
  const addresses = await scope.db.userAddress.findMany({
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json({ ok: true, addresses });
}

export async function POST(req: Request) {
  const scope = await getCustomerScope();
  if (!scope) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { userId, db } = scope;

  try {
    const body = await req.json();
    const label = String(body.label ?? 'HOME').toUpperCase() as AddressLabel;
    const society = typeof body.society === 'string' ? body.society.trim() : '';
    const building = typeof body.building === 'string' ? body.building.trim() : '';
    const flat = typeof body.flat === 'string' ? body.flat.trim() : '';
    const setAsDefault = Boolean(body.setAsDefault);

    if (!VALID_LABELS.has(label)) {
      return NextResponse.json({ ok: false, error: 'Invalid label' }, { status: 400 });
    }
    if (!society || !building || !flat) {
      return NextResponse.json({ ok: false, error: 'Society, building and flat are required' }, { status: 400 });
    }

    // Validate flat number against the building directory when the address
    // matches the seeded Magarpatta clusters; free-text "Other" entries skip
    // validation since we don't know their layout.
    const verified = isVerifiedAddress(society, building);
    if (verified) {
      const b = getBuilding(society, building)!;
      const v = validateFlat(flat, b);
      if (!v.ok) {
        return NextResponse.json({ ok: false, error: v.reason, hint: v.hint }, { status: 400 });
      }
    }

    const existingCount = await db.userAddress.count({});
    const isDefault = setAsDefault || existingCount === 0;

    // Wrapper injects userId into both where (upsert lookup) and create.
    const address = await db.userAddress.upsert({
      where: {
        userId_society_building_flat: { userId, society, building, flat },
      },
      // userId listed for type satisfaction; wrapper would override.
      create: { userId, label, society, building, flat, verified, isDefault },
      update: { label, verified },
    });

    if (isDefault) {
      await db.userAddress.updateMany({
        where: { NOT: { id: address.id } },
        data: { isDefault: false },
      });
      await db.userAddress.update({ where: { id: address.id }, data: { isDefault: true } });
    }

    const refreshed = await db.userAddress.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json({ ok: true, addresses: refreshed, addressId: address.id });
  } catch (e) {
    console.error('[addresses] POST failed:', e);
    return NextResponse.json({ ok: false, error: (e as Error).message || 'Bad request' }, { status: 400 });
  }
}
