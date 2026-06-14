import 'server-only';
import { prisma } from './prisma';

/**
 * Customer-facing notification fan-out. Phase 1 surfaces are:
 *   - in-app: a CustomerNotification row that the bell drawer reads
 *   - WhatsApp: short summary via Twilio (when env is configured)
 *   - email: deferred — no email module exists yet
 *
 * Each helper here is fire-and-forget at the call site. Failure to deliver
 * one channel never blocks the others; failure of the whole fan-out never
 * blocks the upstream operation (e.g. weight reconciliation succeeds even
 * if WhatsApp is down).
 */

interface ReconcileLine {
  name: string;
  oldInr: number;
  newInr: number;
  oldGrams: number | null;
  newGrams: number;
  deltaPct: number;
  note?: string;
}

interface WeightArgs {
  userId: string;
  userPhone: string;
  orderId: string;
  oldTotal: number;
  newTotal: number;
  lines: ReconcileLine[];
}

function shortOrderId(id: string): string { return id.slice(-6); }

function formatWeightMessage(a: WeightArgs): string {
  const lines: string[] = [];
  const delta = a.newTotal - a.oldTotal;
  const direction = delta === 0 ? 'unchanged' : delta > 0 ? `+₹${delta}` : `−₹${Math.abs(delta)}`;
  lines.push(`*MagarpattaGo* — Order #${shortOrderId(a.orderId)} weighed`);
  lines.push('');
  for (const ln of a.lines) {
    lines.push(`• ${ln.name}: ${ln.oldGrams ?? '?'}g → ${ln.newGrams}g · ₹${ln.oldInr} → ₹${ln.newInr}`);
    if (ln.note) lines.push(`   — ${ln.note}`);
  }
  lines.push('');
  lines.push(`Total: ₹${a.oldTotal} → ₹${a.newTotal} (${direction})`);
  lines.push('Settled at delivery — no separate payment needed.');
  return lines.join('\n');
}

/**
 * Vendor confirmed actual weights for soldByWeight items. Inserts a bell-
 * drawer notification and pushes a WhatsApp summary.
 */
export async function notifyCustomerWeightReconciled(a: WeightArgs): Promise<void> {
  const delta = a.newTotal - a.oldTotal;
  const direction = delta === 0 ? 'unchanged' : delta > 0 ? `+₹${delta}` : `−₹${Math.abs(delta)}`;
  const title = `Order #${shortOrderId(a.orderId)} weight confirmed — total ${direction}`;
  const body = formatWeightMessage(a);

  // In-app insert (the bell drawer reads this). Don't block on WhatsApp.
  // Cast through Prisma's input json — Prisma's JSON column rejects custom
  // typed arrays directly but accepts the structural-equivalent JsonValue.
  await prisma.customerNotification
    .create({
      data: {
        userId: a.userId,
        kind: 'WEIGHT_RECONCILED',
        title,
        body,
        orderId: a.orderId,
        metadata: JSON.parse(JSON.stringify({ oldTotal: a.oldTotal, newTotal: a.newTotal, lines: a.lines })),
      },
    })
    .catch((e) => console.error('[notify] insert failed', (e as Error).message));

  // WhatsApp fan-out — only fires when Twilio env is set. Reuses the same
  // sandbox config the vendor-side notification uses, swapping the message.
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) {
    return;
  }
  try {
    const twilio = (await import('twilio')).default;
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID as string,
      process.env.TWILIO_AUTH_TOKEN as string,
    );
    // During sandbox we still target the test recipient — production should
    // route via the customer's verified WA number (phase 2).
    const to = process.env.WHATSAPP_TEST_RECIPIENT ?? `whatsapp:+91${a.userPhone}`;
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to,
      body,
    });
  } catch (e) {
    console.error('[notify] whatsapp send failed', (e as Error).message);
  }
}
