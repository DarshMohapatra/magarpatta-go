import { NextResponse } from 'next/server';
import type { AddressLabel } from '@prisma/client';
import { getCustomerScope } from '@/lib/customer-scope';

const VALID_LABELS = new Set<AddressLabel>(['HOME', 'WORK', 'OTHER']);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getCustomerScope();
  if (!scope) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { db } = scope;
  const { id } = await params;

  // Ownership: wrapper rewrites where to include userId. If the address
  // belongs to someone else, this returns null → 404.
  const existing = await db.userAddress.findFirst({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: 'Address not found' }, { status: 404 });

  try {
    const body = await req.json();
    const data: { label?: AddressLabel } = {};
    if (body.label !== undefined) {
      const label = String(body.label).toUpperCase() as AddressLabel;
      if (!VALID_LABELS.has(label)) return NextResponse.json({ ok: false, error: 'Invalid label' }, { status: 400 });
      data.label = label;
    }

    if (Object.keys(data).length > 0) {
      await db.userAddress.update({ where: { id }, data });
    }

    if (body.setAsDefault === true) {
      await db.userAddress.updateMany({
        where: { NOT: { id } },
        data: { isDefault: false },
      });
      await db.userAddress.update({ where: { id }, data: { isDefault: true } });
    }

    const refreshed = await db.userAddress.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json({ ok: true, addresses: refreshed });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message || 'Bad request' }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getCustomerScope();
  if (!scope) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const { db } = scope;
  const { id } = await params;

  const existing = await db.userAddress.findFirst({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: 'Address not found' }, { status: 404 });

  await db.userAddress.delete({ where: { id } });

  // If we removed the default, promote whichever address remains (most recent).
  if (existing.isDefault) {
    const next = await db.userAddress.findFirst({ orderBy: { createdAt: 'desc' } });
    if (next) {
      await db.userAddress.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  const refreshed = await db.userAddress.findMany({
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json({ ok: true, addresses: refreshed });
}
