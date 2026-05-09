import { NextResponse } from 'next/server';
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
 * Postmark inbound parse webhook. Configure under Postmark → Servers → Inbound
 * with URL = https://<host>/api/channels/email/inbound?token=$INBOUND_EMAIL_TOKEN
 *
 * This handler also accepts SendGrid Inbound Parse if its `parsed` flag is on
 * (most fields overlap), though the field names below assume Postmark.
 */
interface PostmarkInbound {
  MessageID?: string;
  FromFull?: { Email?: string; Name?: string };
  From?: string;
  To?: string;
  ToFull?: Array<{ Email?: string }>;
  Subject?: string;
  TextBody?: string;
  StrippedTextReply?: string; // Postmark's quoted-reply stripper output
  HtmlBody?: string;
}

const TICKET_CODE_RE = /\bT-[A-Z0-9]{6}\b/;

export async function POST(req: Request) {
  // Token-in-URL auth keeps the implementation simple and provider-agnostic.
  // Postmark/SendGrid both let you embed query params on the inbound URL.
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const expected = process.env.INBOUND_EMAIL_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let payload: PostmarkInbound;
  try { payload = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }

  const externalId = (payload.MessageID ?? '').trim() || `noid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const fromAddr   = (payload.FromFull?.Email ?? payload.From ?? '').toLowerCase();
  const fromName   =  payload.FromFull?.Name ?? '';
  const toAddr     = (payload.ToFull?.[0]?.Email ?? payload.To ?? '').toLowerCase();
  const subject    = (payload.Subject ?? '').trim();
  const bodyText   = (payload.StrippedTextReply ?? payload.TextBody ?? '').trim();

  // Idempotency — same provider retry hits the same Message-ID, no-op safely.
  const dupe = await prisma.incomingChannelEvent.findUnique({
    where: { channel_externalId: { channel: 'EMAIL', externalId } },
  });
  if (dupe) return NextResponse.json({ ok: true, deduped: true });

  // Subject like "Re: [T-ABCDEF] …" → thread onto the existing ticket. This
  // is the most reliable thread signal; all our outbound replies should
  // include the shortCode in the subject.
  const codeMatch = subject.match(TICKET_CODE_RE);
  let ticket = codeMatch
    ? await prisma.supportTicket.findUnique({ where: { shortCode: codeMatch[0] } })
    : null;

  // Otherwise try to match the sender by email. If neither, this lands in the
  // inbox unassigned and admin triages it manually.
  const user = ticket ? null : await prisma.user.findUnique({ where: { email: fromAddr } });

  const incoming = await prisma.incomingChannelEvent.create({
    data: {
      channel: 'EMAIL',
      externalId,
      fromAddr,
      toAddr,
      subject,
      bodyText,
      rawPayload: payload as unknown as Prisma.InputJsonValue,
      ticketId: ticket?.id ?? null,
    },
  });

  if (ticket) {
    if (ticket.status === 'CLOSED') {
      // Closed tickets do not auto-reopen on inbound email — keeps customers
      // from being able to resurrect a ticket the team has already burned to
      // the ground. The IncomingChannelEvent is still recorded for audit.
      return NextResponse.json({ ok: true, ignored: 'ticket closed', ticketId: ticket.id });
    }
    const isReopen = ticket.status === 'RESOLVED';
    const now = new Date();
    const nextStatus = ticket.status === 'OPEN' ? 'OPEN' : 'IN_REVIEW';
    await prisma.$transaction([
      prisma.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          author: 'CUSTOMER',
          authorName: fromName || fromAddr,
          body: bodyText || '[empty email body]',
        },
      }),
      prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: nextStatus,
          lastReopenedAt: isReopen ? now : ticket.lastReopenedAt,
          resolvedAt: isReopen ? null : ticket.resolvedAt,
        },
      }),
    ]);
    return NextResponse.json({ ok: true, threaded: true, ticketId: ticket.id });
  }

  if (!user) {
    // Unknown sender — kept in IncomingChannelEvent for admin triage.
    return NextResponse.json({ ok: true, queuedForTriage: true, incomingId: incoming.id });
  }

  // New email ticket from a known user.
  const cleanSubject  = subject.length >= 4 && subject.length <= 120 ? subject : (bodyText.slice(0, 80) || 'Email enquiry');
  const description   = (bodyText || '[empty email body]').slice(0, 4000);
  const routing = await decideRouting({
    category: 'OTHER',
    channel: 'EMAIL',
    hasOrder: false,
    subjectAndBody: `${cleanSubject}\n${description}`,
  });
  const createdAt = new Date();
  const sla = await computeSlaTargets({ priority: 'NORMAL', team: routing.team, createdAt });
  const shortCode = await generateShortCode();

  const newTicket = await prisma.supportTicket.create({
    data: {
      shortCode,
      userId: user.id,
      category: 'OTHER',
      subject: cleanSubject.slice(0, 120),
      channel: 'EMAIL',
      externalThreadKey: externalId,
      team: routing.team,
      assignedAgentId: routing.assignedAgentId,
      slaPolicyId: sla.policyId,
      firstResponseDueAt: sla.firstResponseDueAt,
      resolveDueAt: sla.resolveDueAt,
      createdAt,
      messages: { create: { author: 'CUSTOMER', authorName: user.name ?? fromAddr, body: description } },
    },
  });

  await prisma.incomingChannelEvent.update({
    where: { id: incoming.id },
    data: { ticketId: newTicket.id },
  });

  logActivity({
    actorRole: 'CUSTOMER',
    actorId: user.id,
    actorName: user.name ?? fromAddr,
    action: 'TICKET_OPEN',
    summary: `${user.name ?? fromAddr} opened ${shortCode} via email`,
    metadata: { ticketId: newTicket.id, channel: 'EMAIL', externalId },
  });

  return NextResponse.json({ ok: true, ticketId: newTicket.id, shortCode });
}
