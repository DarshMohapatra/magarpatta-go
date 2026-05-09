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
    <main className="min-h-screen bg-[color:var(--color-cream)]">
      <div className="mx-auto max-w-[840px] px-5 sm:px-8 py-12 sm:py-20">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-saffron)]">
          {siteConfig.siteName} · Help
        </div>
        <h1 className="mt-3 font-serif text-[40px] sm:text-[56px] leading-[1.05] tracking-[-0.015em]">
          Answers, <span className="italic text-[color:var(--color-forest)]">found.</span>
        </h1>
        <p className="mt-3 text-[14.5px] text-[color:var(--color-ink-soft)] max-w-[60ch]">
          The most common questions, answered. Can't find what you need?{' '}
          <Link href="/support/new" className="underline hover:text-[color:var(--color-ink)]">Open a ticket</Link>{' '}— a real person replies, usually within an hour.
        </p>

        {articles.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-10 text-center">
            <p className="font-serif text-[24px]">No articles yet.</p>
            <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)]">Check back soon.</p>
          </div>
        ) : null}

        <div className="mt-10 space-y-10">
          {[...grouped.entries()].map(([k, list]) => (
            <section key={k}>
              <h2 className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-ink-soft)]">
                {k === '_uncategorized' ? 'General' : TICKET_CATEGORY_LABEL[k as TicketCategory]}
              </h2>
              <ul className="mt-3 divide-y divide-[color:var(--color-ink)]/8 bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 overflow-hidden">
                {list.map((a) => (
                  <li key={a.id}>
                    <Link href={`/help/${a.slug}`} className="block px-5 py-4 hover:bg-[color:var(--color-cream)] transition-colors">
                      <div className="font-medium text-[15px]">{a.title}</div>
                      <div className="mt-1 text-[12.5px] text-[color:var(--color-ink-soft)] line-clamp-2">
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
