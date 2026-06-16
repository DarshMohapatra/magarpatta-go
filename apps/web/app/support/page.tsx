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
  const openCount = tickets.filter((t) => t.status !== 'CLOSED' && t.status !== 'RESOLVED').length;
  return (
    <>
    <MobileShell topBar={<TopBar session={session} />}>
      {/* Breadcrumb to /profile */}
      <div className="px-4 lg:px-8 pt-4 max-w-[1080px] mx-auto">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-[12px] text-[color:var(--color-muted)] hover:text-[color:var(--color-primary)]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to profile
        </Link>
      </div>

      {/* Gradient-warm hero — matches /home + /profile + /orders */}
      <div className="px-4 lg:px-8 pt-3 max-w-[1080px] mx-auto">
        <div className="relative overflow-hidden rounded-[var(--radius-2xl)] gradient-warm text-white p-5 shadow-[var(--shadow-glow)]">
          <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-end justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] font-semibold opacity-90">Support</div>
              <h1 className="mt-2 font-display text-[26px] leading-tight tracking-tight">
                Anything went wrong?
              </h1>
              <p className="mt-1 text-[12.5px] opacity-90 max-w-[420px]">
                {openCount > 0
                  ? `${openCount} open ticket${openCount === 1 ? '' : 's'} · ops replies in a few hours`
                  : 'Ops replies within a few hours during the day.'}
              </p>
            </div>
            <Link
              href="/support/new"
              className="rounded-full bg-white text-[color:var(--color-primary)] px-3.5 py-1.5 text-[12px] font-semibold shadow-[var(--shadow-soft)] shrink-0"
            >
              + New
            </Link>
          </div>
        </div>
      </div>

      <section className="pb-20">
        <div className="mx-auto max-w-[1080px] px-4 sm:px-6 lg:px-8">
          {tickets.length === 0 ? (
            <div className="mt-6 rounded-[var(--radius-2xl)] bg-[color:var(--color-surface)] border border-[color:var(--color-border)]/60 shadow-[var(--shadow-soft)] p-10 text-center">
              <p className="font-display text-[26px] leading-tight">No tickets yet.</p>
              <p className="mt-2 text-[14px] text-[color:var(--color-muted)]">
                Hopefully it stays that way. If something does go wrong, you can file from here or from any order's detail page.
              </p>
              <Link href="/support/new" className="mt-6 inline-block text-[color:var(--color-primary)] underline underline-offset-2 text-[14px]">
                File the first one →
              </Link>
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {tickets.map((t) => {
                const last = t.messages[0];
                const lastIsAgent = last?.author === 'HELPDESK';
                return (
                  <li key={t.id}>
                    <Link
                      href={`/support/${t.id}`}
                      className="block bg-[color:var(--color-surface)] rounded-[var(--radius-xl)] border border-[color:var(--color-border)]/60 shadow-[var(--shadow-soft)] p-4 hover:border-[color:var(--color-primary)]/40 active:scale-[0.995] transition-all"
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
