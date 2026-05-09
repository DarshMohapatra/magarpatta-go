import { NextResponse } from 'next/server';
import { getCustomerScope } from '@/lib/customer-scope';
import { prisma } from '@/lib/prisma';
import { isTicketCategory } from '@/lib/support-tickets';
import { generateShortCode } from '@/lib/support-tickets-server';
import { logActivity } from '@/lib/activity-log';
import { decideRouting } from '@/lib/support-routing';
import { computeSlaTargets } from '@/lib/sla';

export const dynamic = 'force-dynamic';

export async function GET() {
  const scope = await getCustomerScope();
  if (!scope) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: scope.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      order: { select: { id: true, totalInr: true, vendorName: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { author: true, body: true, createdAt: true } },
    },
  });

  return NextResponse.json({ ok: true, tickets });
}

export async function POST(req: Request) {
  const scope = await getCustomerScope();
  if (!scope) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  let body: { category?: string; subject?: string; description?: string; orderId?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }

  const category = body.category;
  const subject = (body.subject ?? '').trim();
  const description = (body.description ?? '').trim();
  const orderId = body.orderId?.trim() || null;

  if (!isTicketCategory(category)) return NextResponse.json({ ok: false, error: 'Pick a category' }, { status: 400 });
  if (subject.length < 4 || subject.length > 120) return NextResponse.json({ ok: false, error: 'Subject must be 4–120 characters' }, { status: 400 });
  if (description.length < 10 || description.length > 4000) return NextResponse.json({ ok: false, error: 'Tell us what happened (10–4000 characters)' }, { status: 400 });

  // If orderId is given, verify it belongs to this customer (block IDOR).
  if (orderId) {
    const owns = await scope.db.order.findFirst({ where: { id: orderId }, select: { id: true } });
    if (!owns) return NextResponse.json({ ok: false, error: 'That order is not yours' }, { status: 403 });
  }

  const shortCode = await generateShortCode();
  const customerName = scope.session.name ?? `+91 ${scope.session.phone}`;

  // Route + SLA at create-time. NORMAL is the default priority; routing rules
  // or admin escalation can bump it later. Channel is always IN_APP here —
  // email/WhatsApp tickets are minted by the channel webhooks instead.
  const routing = await decideRouting({
    category,
    channel: 'IN_APP',
    hasOrder: !!orderId,
    subjectAndBody: `${subject}\n${description}`,
  });
  const createdAt = new Date();
  const sla = await computeSlaTargets({ priority: 'NORMAL', team: routing.team, createdAt });

  const ticket = await prisma.supportTicket.create({
    data: {
      shortCode,
      userId: scope.userId,
      orderId,
      category,
      subject,
      channel: 'IN_APP',
      team: routing.team,
      assignedAgentId: routing.assignedAgentId,
      slaPolicyId: sla.policyId,
      firstResponseDueAt: sla.firstResponseDueAt,
      resolveDueAt: sla.resolveDueAt,
      createdAt,
      messages: { create: { author: 'CUSTOMER', authorName: customerName, body: description } },
    },
    include: { messages: true },
  });

  logActivity({
    actorRole: 'CUSTOMER',
    actorId: scope.userId,
    actorName: customerName,
    action: 'TICKET_OPEN',
    summary: `${customerName} opened ticket ${shortCode} (${category})`,
    metadata: { ticketId: ticket.id, category, orderId },
  });

  return NextResponse.json({ ok: true, ticket });
}
