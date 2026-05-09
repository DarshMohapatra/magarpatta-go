import { notFound, redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-session';
import { AdminShell } from '@/components/admin/admin-shell';
import { prisma } from '@/lib/prisma';
import { ArticleEditor } from '../article-editor';

export const dynamic = 'force-dynamic';

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/signin');
  const { id } = await params;
  const article = await prisma.kbArticle.findUnique({ where: { id } });
  if (!article) notFound();

  return (
    <AdminShell name={admin.name} role={admin.role}>
      <ArticleEditor
        initial={{
          id: article.id,
          slug: article.slug,
          title: article.title,
          body: article.body,
          category: article.category,
          tags: article.tags,
          isPublic: article.isPublic,
          archived: article.archived,
        }}
      />
    </AdminShell>
  );
}
