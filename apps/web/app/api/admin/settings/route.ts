import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';
import { setSetting, type SettingKey, type SlotDefinition } from '@/lib/settings';

interface UpdateBody {
  delivery_fee_inr?: number;
  slot_definitions?: SlotDefinition[];
  wholesale_only_mode?: boolean;
}

function validateSlotDefinition(s: unknown): s is SlotDefinition {
  if (!s || typeof s !== 'object') return false;
  const d = s as Record<string, unknown>;
  const cutoffOk = d.cutoffMinutesBefore === undefined
    || (typeof d.cutoffMinutesBefore === 'number' && d.cutoffMinutesBefore >= 0 && d.cutoffMinutesBefore <= 7 * 24 * 60);
  return (
    typeof d.id === 'string' && d.id.length > 0 &&
    typeof d.label === 'string' && d.label.length > 0 &&
    typeof d.startMin === 'number' && d.startMin >= 0 && d.startMin < 1440 &&
    typeof d.endMin === 'number' && d.endMin > 0 && d.endMin <= 1440 &&
    d.endMin > d.startMin &&
    typeof d.capacity === 'number' && d.capacity >= 0 &&
    cutoffOk
  );
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'OPS') {
    return NextResponse.json({ ok: false, error: 'Insufficient permission' }, { status: 403 });
  }

  let body: UpdateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const actor = { id: admin.id, name: admin.name };
  const updated: SettingKey[] = [];

  if (body.delivery_fee_inr !== undefined) {
    const fee = body.delivery_fee_inr;
    if (!Number.isInteger(fee) || fee < 0 || fee > 500) {
      return NextResponse.json(
        { ok: false, error: 'delivery_fee_inr must be a whole rupee value between 0 and 500' },
        { status: 400 },
      );
    }
    await setSetting('delivery_fee_inr', fee, actor);
    updated.push('delivery_fee_inr');
  }

  if (body.slot_definitions !== undefined) {
    if (!Array.isArray(body.slot_definitions) || !body.slot_definitions.every(validateSlotDefinition)) {
      return NextResponse.json(
        { ok: false, error: 'slot_definitions has invalid entries — each needs id, label, startMin<endMin (0–1440), capacity, optional cutoffMinutesBefore' },
        { status: 400 },
      );
    }
    const ids = body.slot_definitions.map((s) => s.id);
    if (new Set(ids).size !== ids.length) {
      return NextResponse.json({ ok: false, error: 'Slot ids must be unique' }, { status: 400 });
    }
    await setSetting('slot_definitions', body.slot_definitions, actor);
    updated.push('slot_definitions');
  }

  if (body.wholesale_only_mode !== undefined) {
    if (typeof body.wholesale_only_mode !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'wholesale_only_mode must be true/false' }, { status: 400 });
    }
    await setSetting('wholesale_only_mode', body.wholesale_only_mode, actor);
    updated.push('wholesale_only_mode');
  }

  if (updated.length === 0) {
    return NextResponse.json({ ok: false, error: 'Nothing to update' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, updated });
}
