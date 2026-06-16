import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCustomerScope } from '@/lib/customer-scope';
import { prisma } from '@/lib/prisma';
import { CartDrawer } from '@/components/cart-drawer';
import { MobileShell } from '@/components/customer/mobile-shell';
import { TopBar } from '@/components/customer/top-bar';
import { getServerSession } from '@/lib/session';
import { TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL } from '@/lib/support-tickets';

export const dynamic = 'force-dynamic';

export default async function SupportPage() {
  const scope = await getCustomerScope();
  if (!scope) redirect('/signin');

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: scope.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      order: { select: { id: true, vendorName: true, totalInr: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { author: true, body: true, createdAt: true } },
    },
  });

  const session = await getServerSession();
  return (
    <>
    <MobileShell topBar={<TopBar session={session} />}>
      <section className="pt-6 pb-20">
        <div className="mx-auto max-w-[1080px] px-6 lg:px-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Support</div>
              <h1 className="mt-3 font-display text-[44px] lg:text-[56px] leading-[0.98] tracking-[-0.02em]">
                Anything <span className="italic text-[color:var(--color-primary)]">went wrong?</span>
              </h1>
              <p className="mt-3 text-[14px] text-[color:var(--color-muted)] max-w-[480px]">
                File a ticket below. Our ops team replies within a few hours during the day, by the next morning at night.
              </p>
            </div>
            <Link
              href="/support/new"
              className="inline-flex items-center gap-2 bg-[color:var(--color-primary)] text-[color:var(--color-background)] px-5 py-3 rounded-full text-[14px] font-medium hover:bg-[color:var(--color-primary)] transition-colors"
            >
              + New ticket
            </Link>
          </div>

          {tickets.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-[color:var(--color-foreground)]/10 bg-[color:var(--color-surface)] p-10 text-center">
              <p className="font-display text-[26px] leading-tight">No tickets yet.</p>
              <p className="mt-2 text-[14px] text-[color:var(--color-muted)]">
                Hopefully it stays that way. If something does go wrong, you can file from here or from any order's detail page.
              </p>
              <Link href="/support/new" className="mt-6 inline-block text-[color:var(--color-primary)] underline underline-offset-2 text-[14px]">
                File the first one →
              </Link>
            </div>
          ) : (
            <ul className="mt-10 space-y-3">
              {tickets.map((t) => {
                const last = t.messages[0];
                const lastIsAgent = last?.author === 'HELPDESK';
                return (
                  <li key={t.id}>
                    <Link
                      href={`/support/${t.id}`}
                      className="block bg-[color:var(--color-surface)] rounded-2xl border border-[color:var(--color-foreground)]/10 p-5 hover:border-[color:var(--color-primary)]/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="text-[10.5px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-[color:var(--color-saffron)]/15 text-[color:var(--color-gold)] font-medium">
                          {TICKET_STATUS_LABEL[t.status]}
                        </span>
                        <span className="text-[11px] text-[color:var(--color-muted)] font-mono">{t.shortCode}</span>
                      </div>
                      <h3 className="font-display text-[20px] leading-tight">{t.subject}</h3>
                      <div className="mt-1 text-[12px] text-[color:var(--color-muted)]">
                        {TICKET_CATEGORY_LABEL[t.category]}
                        {t.order && t.order.vendorName ? ` · order from ${t.order.vendorName}` : ''}
                      </div>
                      {last ? (
                        <div className="mt-3 text-[13px] text-[color:var(--color-muted)] line-clamp-2">
                          <b className="text-[color:var(--color-foreground)]">{lastIsAgent ? 'Helpdesk:' : 'You:'}</b> {last.body}
                        </div>
                      ) : null}
                      <div className="mt-3 text-[11px] text-[color:var(--color-muted)]">
                        Filed {new Date(t.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </MobileShell>
    <CartDrawer />
    </>
  );
}
