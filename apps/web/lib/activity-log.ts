import 'server-only';
import type { ActorRole, Prisma } from '@prisma/client';
import { prisma } from './prisma';

interface LogArgs {
  actorRole: ActorRole;
  actorId?: string | null;
  actorName: string;
  action: string;          // verb-y key, e.g. 'CAMPAIGN_CREATE', 'ORDER_ACCEPT'
  summary: string;         // human-readable line
  metadata?: Prisma.InputJsonValue;
}

/**
 * Cross-portal audit trail. Best-effort fire-and-forget — we never want a
 * logging failure to break the user's actual action, so all errors are
 * swallowed and logged to console.
 */
export async function logActivity(args: LogArgs): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        actorRole: args.actorRole,
        actorId: args.actorId ?? null,
        actorName: args.actorName,
        action: args.action,
        summary: args.summary,
        metadata: args.metadata,
      },
    });
  } catch (e) {
    console.error('[activity-log] failed to write:', e);
  }
}
