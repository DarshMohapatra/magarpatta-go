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
  /** Minimum minutes the order must be placed BEFORE the slot starts.
   *  Defaults to 0 (no cutoff). Wholesale uses this to enforce procurement
   *  timing — e.g. 9 AM slot with 900-min cutoff stops accepting orders at
   *  6 PM the previous day. */
  cutoffMinutesBefore?: number;
}

export interface CustomerNotice {
  /** Shown verbatim in the banner across customer pages. Keep it short. */
  message: string;
  /** Styling cue. info = blue/forest, warning = saffron, alert = terracotta. */
  level: 'info' | 'warning' | 'alert';
  /** Off-switch without clearing the message. */
  active: boolean;
}

export interface SettingShape {
  delivery_fee_inr: number;
  slot_definitions: SlotDefinition[];
  /** When true, the customer catalog only shows products from vendors with
   *  Vendor.isWholesale=true. Used to soft-launch with a curated subset of
   *  suppliers; admin flips this for the public launch. */
  wholesale_only_mode: boolean;
  /** Admin-broadcast banner shown across customer pages. Used to flag slot
   *  changes, weather delays, holiday hours, etc. */
  customer_notice: CustomerNotice;
  /** Whitelist of Category.slug values that show up in the public catalog.
   *  Empty array = show every category (no filter). Used at Phase-1 launch
   *  to expose only fruits + veggies while bread/eggs/meat sit dormant. */
  catalog_allowed_categories: string[];
  /** When the cart subtotal is at or above this threshold and the bypass is
   *  enabled, the customer can place the order outside a delivery slot via
   *  an "Express" option. 0 disables the lower bound entirely. */
  slot_bypass_threshold_inr: number;
  /** Master switch for the slot-bypass feature. Off = customer must always
   *  pick a slot, no matter the cart size. */
  slot_bypass_enabled: boolean;
}

export const SETTINGS_DEFAULTS: SettingShape = {
  delivery_fee_inr: 15,
  slot_definitions: [],
  wholesale_only_mode: false,
  customer_notice: { message: '', level: 'info', active: false },
  catalog_allowed_categories: ['produce'],
  slot_bypass_threshold_inr: 1000,
  slot_bypass_enabled: true,
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

export const getWholesaleOnlyMode = cache(async (): Promise<boolean> => {
  return readRaw('wholesale_only_mode');
});

export const getCustomerNotice = cache(async (): Promise<CustomerNotice> => {
  return readRaw('customer_notice');
});

export const getAllowedCategorySlugs = cache(async (): Promise<string[]> => {
  return readRaw('catalog_allowed_categories');
});

export const getSlotBypassConfig = cache(async (): Promise<{ enabled: boolean; thresholdInr: number }> => {
  const [enabled, thresholdInr] = await Promise.all([
    readRaw('slot_bypass_enabled'),
    readRaw('slot_bypass_threshold_inr'),
  ]);
  return { enabled, thresholdInr };
});

/**
 * Returns every setting key in one shot — used by the admin settings screen
 * so it can render the whole form without a fan-out of getters.
 */
export const getAllSettings = cache(async (): Promise<SettingShape> => {
  const [fee, slots, wholesaleOnly, notice, allowedCats, bypassEnabled, bypassThreshold] = await Promise.all([
    getDeliveryFeeInr(),
    getSlotDefinitions(),
    getWholesaleOnlyMode(),
    getCustomerNotice(),
    getAllowedCategorySlugs(),
    readRaw('slot_bypass_enabled'),
    readRaw('slot_bypass_threshold_inr'),
  ]);
  return {
    delivery_fee_inr: fee,
    slot_definitions: slots,
    wholesale_only_mode: wholesaleOnly,
    customer_notice: notice,
    catalog_allowed_categories: allowedCats,
    slot_bypass_threshold_inr: bypassThreshold,
    slot_bypass_enabled: bypassEnabled,
  };
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
