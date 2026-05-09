import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { siteConfig } from '@/lib/site-config';
import { TICKET_CATEGORY_LABEL } from '@/lib/support-tickets';
import { ArticleFeedback } from './article-feedback';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await prisma.kbArticle.findUnique({ where: { slug }, select: { title: true, body: true } });
  if (!a) return { title: 'Not found' };
  return {
    title: `${a.title} · ${siteConfig.platformName} Help`,
    description: a.body.slice(0, 160),
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await prisma.kbArticle.findFirst({
    where: { slug, archived: false, isPublic: true },
  });
  if (!article) notFound();

  // Record an anonymous public view for analytics. No ticketId on this kind.
  await prisma.kbArticleView.create({
    data: { articleId: article.id, kind: 'PUBLIC' },
  });

  return (
    <main className="min-h-screen bg-[color:var(--color-cream)]">
      <div className="mx-auto max-w-[680px] px-5 sm:px-8 py-12 sm:py-20">
        <Link href="/help" className="text-[12px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]">← Help centre</Link>
        {article.category ? (
          <div className="mt-4 text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">
            {TICKET_CATEGORY_LABEL[article.category]}
          </div>
        ) : null}
        <h1 className="mt-2 font-serif text-[36px] sm:text-[48px] leading-[1.05] tracking-[-0.015em]">
          {article.title}
        </h1>

        <article className="mt-8 text-[15.5px] leading-[1.75] whitespace-pre-wrap break-words">
          {article.body}
        </article>

        <div className="mt-12 pt-6 border-t border-[color:var(--color-ink)]/10">
          <ArticleFeedback articleId={article.id} />
        </div>

        <div className="mt-8 rounded-2xl bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 p-5 text-[13.5px]">
          Still stuck?{' '}
          <Link href="/support/new" className="underline font-medium hover:text-[color:var(--color-forest)]">
            Open a ticket
          </Link>
          {' '}and we'll get back within the hour.
        </div>
      </div>
    </main>
  );
}
