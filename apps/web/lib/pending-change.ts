import 'server-only';
import type {
  PendingChangeEntity,
  PendingChangeOperation,
  Prisma,
} from '@prisma/client';
import { prisma } from './prisma';

interface QueueArgs {
  entity: PendingChangeEntity;
  entityId: string | null;
  operation: PendingChangeOperation;
  payload: Prisma.InputJsonValue;
  before?: Prisma.InputJsonValue;
  summary: string;
  vendorId?: string;
  riderId?: string;
}

export async function queueChange(args: QueueArgs) {
  return prisma.pendingChange.create({
    data: {
      entity: args.entity,
      entityId: args.entityId,
      operation: args.operation,
      payload: args.payload,
      before: args.before,
      summary: args.summary,
      vendorId: args.vendorId,
      riderId: args.riderId,
    },
  });
}

export function pickFields<T extends Record<string, unknown>>(
  source: T,
  keys: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in source) out[k] = source[k as keyof T];
  return out;
}

export function summariseFieldEdit(shopName: string, keys: string[]): string {
  const n = keys.length;
  if (n === 0) return `${shopName} · no-op`;
  if (n <= 3) return `${shopName} · ${keys.join(', ')}`;
  return `${shopName} · ${n} fields edited`;
}
