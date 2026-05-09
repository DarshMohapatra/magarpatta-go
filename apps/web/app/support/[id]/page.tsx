import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCustomerScope } from '@/lib/customer-scope';
import { prisma } from '@/lib/prisma';
import { NavbarWithSession } from '@/components/navbar-with-session';
import { Footer } from '@/components/footer';
import { CartDrawer } from '@/components/cart-drawer';
import { TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL } from '@/lib/support-tickets';
import { TicketReplyForm } from './reply-form';

export const dynamic = 'force-dynamic';

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const scope = await getCustomerScope();
  if (!scope) redirect('/signin');
  const { id } = await params;

  const ticket = await prisma.supportTicket.findFirst({
    where: { id, userId: scope.userId },
    include: {
      order: { select: { id: true, vendorName: true, totalInr: true, placedAt: true } },
      messages: { orderBy: { createdAt: 'asc' } },
      assignedAgent: { select: { name: true } },
    },
  });
  if (!ticket) notFound();

  const isClosed = ticket.status === 'CLOSED';

  return (
    <main className="relative z-10 min-h-screen">
      <NavbarWithSession />
      <section className="pt-24 pb-20">
        <div className="mx-auto max-w-[820px] px-6 lg:px-10">
          <Link href="/support" className="text-[12px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]">← All tickets</Link>

          <div className="mt-4 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-[color:var(--color-saffron)]/15 text-[color:var(--color-gold)] font-medium">
                  {TICKET_STATUS_LABEL[ticket.status]}
                </span>
                <span className="text-[11px] font-mono text-[color:var(--color-ink-soft)]">{ticket.shortCode}</span>
              </div>
              <h1 className="mt-3 font-serif text-[32px] lg:text-[40px] leading-[1.05] tracking-[-0.01em]">{ticket.subject}</h1>
              <div className="mt-2 text-[12.5px] text-[color:var(--color-ink-soft)]">
                {TICKET_CATEGORY_LABEL[ticket.category]}
                {ticket.assignedAgent ? ` · handled by ${ticket.assignedAgent.name}` : ''}
              </div>
            </div>
          </div>

          {ticket.order ? (
            <Link
              href={`/orders/${ticket.order.id}`}
              className="mt-5 inline-flex items-center gap-3 bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 rounded-xl px-4 py-3 hover:border-[color:var(--color-forest)]/40"
            >
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">Linked order</div>
              <div className="text-[13px]">
                #{ticket.order.id.slice(-6).toUpperCase()} · {ticket.order.vendorName ?? 'Multiple shops'} · ₹{ticket.order.totalInr}
              </div>
            </Link>
          ) : null}

          <ul className="mt-8 space-y-3">
            {ticket.messages.map((m) => (
              <li
                key={m.id}
                className={`rounded-2xl border p-4 ${
                  m.author === 'HELPDESK'
                    ? 'bg-[color:var(--color-forest)]/8 border-[color:var(--color-forest)]/20'
                    : 'bg-[color:var(--color-paper)] border-[color:var(--color-ink)]/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10.5px] uppercase tracking-[0.14em] font-medium">
                    {m.author === 'HELPDESK' ? <span className="text-[color:var(--color-forest)]">Magarpatta Go helpdesk · {m.authorName}</span> : <span className="text-[color:var(--color-saffron)]">You · {m.authorName}</span>}
                  </div>
                  <div className="text-[10.5px] text-[color:var(--color-ink-soft)]">
                    {new Date(m.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
                <p className="text-[13.5px] leading-[1.6] whitespace-pre-wrap">{m.body}</p>
              </li>
            ))}
          </ul>

          {isClosed ? (
            <div className="mt-8 bg-[color:var(--color-cream-soft)] rounded-2xl p-5 text-center text-[13px] text-[color:var(--color-ink-soft)]">
              This ticket is closed. <Link href="/support/new" className="text-[color:var(--color-forest)] underline">File a new one →</Link>
            </div>
          ) : (
            <div className="mt-8">
              <TicketReplyForm ticketId={ticket.id} />
            </div>
          )}
        </div>
      </section>
      <Footer />
      <CartDrawer />
    </main>
  );
}
