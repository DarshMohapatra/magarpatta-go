import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCuratorSession } from '@/lib/curator-session';
import { CuratorShell } from '@/components/curator/curator-shell';
import { CuratorJobClient } from './job-client';

export const dynamic = 'force-dynamic';

interface JobItem {
  name: string;
  mrpInr: number;
  priceInr: number;
  isVeg: boolean;
  isRegulated: boolean;
  unit: string | null;
  description: string | null;
}

export default async function CuratorJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const c = await getCuratorSession();
  if (!c) redirect('/curator/signin');

  const { jobId } = await params;
  const job = await prisma.menuImportJob.findUnique({
    where: { id: jobId },
    include: {
      vendor: { select: { id: true, name: true, slug: true, hub: true } },
      images: { select: { id: true, ord: true }, orderBy: { ord: 'asc' } },
    },
  });
  if (!job) notFound();

  const items = (Array.isArray(job.items) ? job.items : []) as unknown as JobItem[];
  const categories = await prisma.category.findMany({ orderBy: { order: 'asc' }, select: { slug: true, name: true } });

  return (
    <CuratorShell name={c.name}>
      <CuratorJobClient
        job={{
          id: job.id,
          status: job.status,
          source: job.source,
          categorySlug: job.categorySlug,
          submittedAt: job.submittedAt.toISOString(),
          curatorNote: job.curatorNote,
          curatedAt: job.curatedAt?.toISOString() ?? null,
          vendor: job.vendor,
          imageIndices: job.images.map((_, i) => i),
        }}
        initialItems={items}
        categories={categories}
      />
    </CuratorShell>
  );
}
