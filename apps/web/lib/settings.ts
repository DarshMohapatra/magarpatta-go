import 'server-only';
import { cache } from 'react';
import { prisma } from './prisma';

/**
 * Runtime-editable platform configuration. Every reader goes through this
 * module — direct prisma.siteSetting reads are discouraged so the typing +
 * defaults stay centralised.
 *
 * Reads are wrapped in React's cache() so a single request that asks for the
 * delivery fee in multiple places (server component → API route → pricing
 * helper) only hits Postgres once. Writes go through setSetting which also
 * writes an ActivityLog row, so the admin audit trail is automatic.
 *
 * Defaults below are the launch values. If a row hasn't been seeded yet,
 * readers fall back to the default — so the app stays alive on a fresh DB
 * before the seed runs.
 */

export interface SlotDefinition {
  /** Stable identifier, e.g. 'morning-9-11'. Used in Order.deliverySlotId. */
  id: string;
  /** Customer-facing label, e.g. '9 AM – 11 AM'. */
  label: string;
  /** Minutes from local midnight. 540 = 09:00. */
  startMin: number;
  /** Minutes from local midnight. 660 = 11:00. */
  endMin: number;
  /** Soft cap on orders per slot per date. Overbooking is permitted at
   *  launch — the picker shows "filling fast" past this number but the
   *  order still goes through. */
  capacity: number;
}

export interface SettingShape {
  delivery_fee_inr: number;
  slot_definitions: SlotDefinition[];
}

export const SETTINGS_DEFAULTS: SettingShape = {
  delivery_fee_inr: 15,
  slot_definitions: [],
};

export type SettingKey = keyof SettingShape;
export type SettingValue<K extends SettingKey> = SettingShape[K];

async function readRaw<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  if (!row) return SETTINGS_DEFAULTS[key];
  return row.valueJson as SettingValue<K>;
}

export const getDeliveryFeeInr = cache(async (): Promise<number> => {
  return readRaw('delivery_fee_inr');
});

export const getSlotDefinitions = cache(async (): Promise<SlotDefinition[]> => {
  return readRaw('slot_definitions');
});

/**
 * Returns every setting key in one shot — used by the admin settings screen
 * so it can render the whole form without a fan-out of getters.
 */
export const getAllSettings = cache(async (): Promise<{
  delivery_fee_inr: number;
  slot_definitions: SlotDefinition[];
}> => {
  const [fee, slots] = await Promise.all([getDeliveryFeeInr(), getSlotDefinitions()]);
  return { delivery_fee_inr: fee, slot_definitions: slots };
});

export async function setSetting<K extends SettingKey>(
  key: K,
  value: SettingValue<K>,
  actor: { id: string; name: string },
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.siteSetting.upsert({
      where: { key },
      create: { key, valueJson: value as object, updatedById: actor.id },
      update: { valueJson: value as object, updatedById: actor.id },
    });
    await tx.activityLog.create({
      data: {
        actorRole: 'ADMIN',
        actorId: actor.id,
        actorName: actor.name,
        action: 'SETTING_UPDATE',
        summary: `${actor.name} updated ${key}`,
        metadata: { key, value: value as object },
      },
    });
  });
}
