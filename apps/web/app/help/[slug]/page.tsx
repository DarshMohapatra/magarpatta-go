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
    <main className="font-display min-h-screen bg-[color:var(--color-background)]">
      <div className="mx-auto max-w-[720px] px-4 sm:px-6 py-8 sm:py-12">
        <Link href="/help" className="inline-flex items-center gap-1.5 text-[12px] text-[color:var(--color-muted)] hover:text-[color:var(--color-primary)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Help centre
        </Link>

        {/* Gradient-warm hero header */}
        <div className="mt-3 relative overflow-hidden rounded-[var(--radius-2xl)] gradient-warm text-white p-5 sm:p-6 shadow-[var(--shadow-glow)]">
          <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <div className="relative">
            {article.category ? (
              <div className="text-[10px] uppercase tracking-[0.18em] font-semibold opacity-90">
                {TICKET_CATEGORY_LABEL[article.category]}
              </div>
            ) : null}
            <h1 className="mt-2 font-display text-[26px] sm:text-[32px] leading-tight tracking-tight">
              {article.title}
            </h1>
          </div>
        </div>

        <article className="mt-6 text-[14.5px] leading-[1.75] whitespace-pre-wrap break-words">
          {article.body}
        </article>

        <div className="mt-10 pt-6 border-t border-[color:var(--color-border)]/40">
          <ArticleFeedback articleId={article.id} />
        </div>

        <div className="mt-8 rounded-[var(--radius-xl)] bg-[color:var(--color-surface)] border border-[color:var(--color-border)]/60 shadow-[var(--shadow-soft)] p-5 text-[13.5px]">
          Still stuck?{' '}
          <Link href="/support/new" className="underline font-semibold hover:text-[color:var(--color-primary)]">
            Open a ticket
          </Link>
          {' '}and we'll get back within the hour.
        </div>
      </div>
    </main>
  );
}
