import 'server-only';

/**
 * WhatsApp notifications via Twilio's sandbox during the trial. Real-world
 * launch will swap the sandbox `from` number for a verified WhatsApp Business
 * number and the `to` will be each vendor's own number — but the function
 * signature stays the same, so call sites don't need to change.
 *
 * Required env (set on Vercel → Project Settings → Environment Variables):
 *   TWILIO_ACCOUNT_SID         — from Twilio console
 *   TWILIO_AUTH_TOKEN          — from Twilio console
 *   TWILIO_WHATSAPP_FROM       — e.g. "whatsapp:+14155238886" (Twilio sandbox)
 *   WHATSAPP_TEST_RECIPIENT    — e.g. "whatsapp:+919876543210" (your own
 *                                phone, after joining the sandbox)
 *
 * When any of the four is missing we log a warning and skip the send so the
 * order placement isn't blocked by a misconfiguration.
 */

interface NotifyArgs {
  orderId: string;
  vendorName: string | null;
  slotLabel: string | null;
  slotStart: Date | null;
  totalInr: number;
  society: string;
  building: string;
  flat: string;
  items: Array<{ name: string; quantity: number; unit?: string | null }>;
}

function isConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM &&
    process.env.WHATSAPP_TEST_RECIPIENT,
  );
}

function formatMessage(a: NotifyArgs): string {
  const lines: string[] = [];
  lines.push(`*MagarpattaGo* — New order #${a.orderId.slice(-6)}`);
  if (a.slotLabel && a.slotStart) {
    const day = a.slotStart.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
    lines.push(`🕓 ${a.slotLabel} · ${day}`);
  }
  if (a.vendorName) lines.push(`🏪 ${a.vendorName}`);
  lines.push('');
  for (const it of a.items) {
    const qtyLabel = it.quantity > 1 ? `${it.quantity} × ` : '';
    const unitLabel = it.unit ? ` (${it.unit})` : '';
    lines.push(`• ${qtyLabel}${it.name}${unitLabel}`);
  }
  lines.push('');
  lines.push(`📍 Flat ${a.flat}, ${a.building}, ${a.society}`);
  lines.push(`💰 Total: ₹${a.totalInr.toLocaleString('en-IN')}`);
  return lines.join('\n');
}

/**
 * Fire-and-forget WhatsApp notification. Best-effort: any error is logged
 * and swallowed so order placement is never blocked by a WA outage.
 */
export async function notifyVendorOnWhatsApp(args: NotifyArgs): Promise<void> {
  if (!isConfigured()) {
    console.log('[whatsapp] env not set — skipping send for order', args.orderId);
    return;
  }
  try {
    // Dynamic import keeps the twilio SDK out of the cold-start path of
    // requests that don't trigger a WhatsApp send.
    const twilio = (await import('twilio')).default;
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID as string,
      process.env.TWILIO_AUTH_TOKEN as string,
    );
    const msg = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: process.env.WHATSAPP_TEST_RECIPIENT as string,
      body: formatMessage(args),
    });
    console.log('[whatsapp] sent', msg.sid, 'for order', args.orderId);
  } catch (e) {
    console.error('[whatsapp] send failed for order', args.orderId, (e as Error).message);
  }
}
