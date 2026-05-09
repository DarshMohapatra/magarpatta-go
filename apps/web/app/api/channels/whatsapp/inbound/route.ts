import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { decideRouting } from '@/lib/support-routing';
import { computeSlaTargets } from '@/lib/sla';
import { generateShortCode } from '@/lib/support-tickets-server';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Meta WhatsApp Cloud API webhook.
 *   GET  → one-time verification handshake (hub.challenge).
 *   POST → message events. Verified via X-Hub-Signature-256 HMAC against
 *          WHATSAPP_APP_SECRET.
 *
 * Configure in Meta App Dashboard → WhatsApp → Configuration:
 *   Callback URL  = https://<host>/api/channels/whatsapp/inbound
 *   Verify token  = $WHATSAPP_VERIFY_TOKEN
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode      = url.searchParams.get('hub.mode');
  const token     = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected  = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return new Response(challenge, { status: 200, headers: { 'content-type': 'text/plain' } });
  }
  return NextResponse.json({ ok: false }, { status: 403 });
}

export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.WHATSAPP_APP_SECRET;
  // Reject if signature verification is configured but doesn't match. Skipping
  // verification (no secret in env) is allowed only because local-dev tunnels
  // sometimes can't relay the header — production should always set it.
  if (secret) {
    const sig      = req.headers.get('x-hub-signature-256') ?? '';
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
    if (!safeEqual(sig, expected)) {
      return NextResponse.json({ ok: false, error: 'Bad signature' }, { status: 401 });
    }
  }

  let payload: WaWebhookPayload;
  try { payload = JSON.parse(raw) as WaWebhookPayload; }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }

  const results: Array<Record<string, unknown>> = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;
      const businessNumber = value.metadata?.display_phone_number ?? null;
      for (const msg of value.messages ?? []) {
        results.push(await processWaMessage(msg, businessNumber));
      }
    }
  }
  return NextResponse.json({ ok: true, results });
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

interface WaWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { display_phone_number?: string };
        messages?: WaMessage[];
      };
    }>;
  }>;
}

interface WaMessage {
  id?: string;
  from?: string;        // E.164 without `+`
  timestamp?: string;
  type?: string;
  text?: { body?: string };
}

async function processWaMessage(msg: WaMessage, businessNumber: string | null) {
  const externalId = msg.id;
  if (!externalId) return { skipped: 'no-id' };
  // Phase 1 supports text only — media (image/audio/document) is ignored. The
  // raw event is still dropped into IncomingChannelEvent so admin can replay.
  if (msg.type !== 'text' || !msg.text?.body) {
    await prisma.incomingChannelEvent.upsert({
      where: { channel_externalId: { channel: 'WHATSAPP', externalId } },
      create: {
        channel: 'WHATSAPP', externalId,
        fromAddr: msg.from ?? null, toAddr: businessNumber ?? null,
        subject: null, bodyText: `[unsupported message type: ${msg.type ?? 'unknown'}]`,
        rawPayload: msg as unknown as Prisma.InputJsonValue,
      },
      update: {},
    });
    return { skipped: 'unsupported-type', externalId };
  }

  const dupe = await prisma.incomingChannelEvent.findUnique({
    where: { channel_externalId: { channel: 'WHATSAPP', externalId } },
  });
  if (dupe) return { deduped: true };

  const fromE164 = msg.from ?? '';
  // User.phone is the last 10 digits (Indian mobile). E.164 from Meta is
  // typically `91XXXXXXXXXX` — last-10 makes the lookup robust whether the
  // wrapper sent `+91…` or just `91…`.
  const last10   = fromE164.replace(/\D/g, '').slice(-10);
  const bodyText = msg.text.body.trim();

  const incoming = await prisma.incomingChannelEvent.create({
    data: {
      channel: 'WHATSAPP', externalId,
      fromAddr: fromE164, toAddr: businessNumber,
      subject: null, bodyText, rawPayload: msg as object,
    },
  });

  const user = last10 ? await prisma.user.findUnique({ where: { phone: last10 } }) : null;
  if (!user) {
    // Unknown phone — could be a non-customer cold-WA. Sits in the inbox for
    // admin to triage; later we can wire an automated "please use our app to
    // open a ticket" reply.
    return { queuedForTriage: true, incomingId: incoming.id };
  }

  // Roll all WA traffic from one customer onto a single open thread (typical
  // WA conversation pattern). If they have a RESOLVED WA ticket we'll reopen
  // it; if their last WA ticket is CLOSED, we open a fresh one.
  const existing = await prisma.supportTicket.findFirst({
    where: {
      userId: user.id,
      channel: 'WHATSAPP',
      status: { in: ['OPEN', 'IN_REVIEW', 'AWAITING_CUSTOMER', 'RESOLVED'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    const isReopen   = existing.status === 'RESOLVED';
    const now        = new Date();
    const nextStatus = existing.status === 'OPEN' ? 'OPEN' : 'IN_REVIEW';
    await prisma.$transaction([
      prisma.supportTicketMessage.create({
        data: {
          ticketId: existing.id,
          author: 'CUSTOMER',
          authorName: user.name ?? `+91 ${user.phone}`,
          body: bodyText,
        },
      }),
      prisma.supportTicket.update({
        where: { id: existing.id },
        data: {
          status: nextStatus,
          lastReopenedAt: isReopen ? now : existing.lastReopenedAt,
          resolvedAt: isReopen ? null : existing.resolvedAt,
        },
      }),
      prisma.incomingChannelEvent.update({ where: { id: incoming.id }, data: { ticketId: existing.id } }),
    ]);
    return { threaded: true, ticketId: existing.id };
  }

  const subject     = bodyText.slice(0, 80) || 'WhatsApp enquiry';
  const description = bodyText.slice(0, 4000);
  const routing = await decideRouting({
    category: 'OTHER', channel: 'WHATSAPP', hasOrder: false,
    subjectAndBody: `${subject}\n${description}`,
  });
  const createdAt = new Date();
  const sla = await computeSlaTargets({ priority: 'NORMAL', team: routing.team, createdAt });
  const shortCode = await generateShortCode();

  const ticket = await prisma.supportTicket.create({
    data: {
      shortCode,
      userId: user.id,
      category: 'OTHER',
      subject,
      channel: 'WHATSAPP',
      externalThreadKey: fromE164,
      team: routing.team,
      assignedAgentId: routing.assignedAgentId,
      slaPolicyId: sla.policyId,
      firstResponseDueAt: sla.firstResponseDueAt,
      resolveDueAt: sla.resolveDueAt,
      createdAt,
      messages: {
        create: { author: 'CUSTOMER', authorName: user.name ?? `+91 ${user.phone}`, body: description },
      },
    },
  });

  await prisma.incomingChannelEvent.update({
    where: { id: incoming.id },
    data: { ticketId: ticket.id },
  });

  logActivity({
    actorRole: 'CUSTOMER',
    actorId: user.id,
    actorName: user.name ?? `+91 ${user.phone}`,
    action: 'TICKET_OPEN',
    summary: `${user.name ?? '+91 ' + user.phone} opened ${shortCode} via WhatsApp`,
    metadata: { ticketId: ticket.id, channel: 'WHATSAPP', externalId },
  });

  return { newTicket: true, ticketId: ticket.id, shortCode };
}
