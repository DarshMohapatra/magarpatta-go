import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { siteConfig } from '@/lib/site-config';
import { TICKET_CATEGORY_LABEL } from '@/lib/support-tickets';
import type { TicketCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: `Help · ${siteConfig.platformName}`,
  description: `Answers to common questions about ordering, refunds, deliveries, and more on ${siteConfig.platformName}.`,
};

export default async function HelpIndexPage() {
  const articles = await prisma.kbArticle.findMany({
    where: { archived: false, isPublic: true },
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
    select: { id: true, slug: true, title: true, category: true, body: true, tags: true },
  });

  const grouped = new Map<TicketCategory | '_uncategorized', typeof articles>();
  for (const a of articles) {
    const k = (a.category ?? '_uncategorized') as TicketCategory | '_uncategorized';
    const arr = grouped.get(k) ?? [];
    arr.push(a);
    grouped.set(k, arr);
  }

  return (
    <main className="font-display min-h-screen bg-[color:var(--color-background)]">
      <div className="mx-auto max-w-[840px] px-4 sm:px-6 py-8 sm:py-12">
        {/* Gradient-warm hero — customer parity */}
        <div className="relative overflow-hidden rounded-[var(--radius-2xl)] gradient-warm text-white p-5 sm:p-7 shadow-[var(--shadow-glow)]">
          <div className="absolute -top-8 -right-8 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -bottom-8 -left-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="text-[10.5px] uppercase tracking-[0.18em] font-semibold opacity-90">
              {siteConfig.siteName} · Help
            </div>
            <h1 className="mt-2 font-display text-[28px] sm:text-[36px] leading-tight tracking-tight">
              Answers, found.
            </h1>
            <p className="mt-2 text-[13px] sm:text-[14px] opacity-90 max-w-[55ch]">
              The most common questions, answered. Can't find what you need?{' '}
              <Link href="/support/new" className="underline underline-offset-2 hover:text-white">Open a ticket</Link>{' '}
              — a real person replies, usually within an hour.
            </p>
          </div>
        </div>

        {articles.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-2xl)] border border-[color:var(--color-border)]/60 bg-[color:var(--color-surface)] shadow-[var(--shadow-soft)] p-10 text-center">
            <p className="font-display text-[22px]">No articles yet.</p>
            <p className="mt-2 text-[13px] text-[color:var(--color-muted)]">Check back soon.</p>
          </div>
        ) : null}

        <div className="mt-8 space-y-8">
          {[...grouped.entries()].map(([k, list]) => (
            <section key={k}>
              <h2 className="text-[10.5px] uppercase tracking-[0.16em] font-semibold text-[color:var(--color-muted)]">
                {k === '_uncategorized' ? 'General' : TICKET_CATEGORY_LABEL[k as TicketCategory]}
              </h2>
              <ul className="mt-3 divide-y divide-[color:var(--color-border)]/40 bg-[color:var(--color-surface)] rounded-[var(--radius-xl)] border border-[color:var(--color-border)]/60 shadow-[var(--shadow-soft)] overflow-hidden">
                {list.map((a) => (
                  <li key={a.id}>
                    <Link href={`/help/${a.slug}`} className="block px-5 py-4 hover:bg-[color:var(--color-background)] transition-colors">
                      <div className="font-semibold text-[15px] tracking-tight">{a.title}</div>
                      <div className="mt-1 text-[12.5px] text-[color:var(--color-muted)] line-clamp-2">
                        {a.body.replace(/[#*`_>]/g, '').slice(0, 180)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
