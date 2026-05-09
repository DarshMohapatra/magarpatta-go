import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCuratorSession } from '@/lib/curator-session';
import { CuratorShell } from '@/components/curator/curator-shell';

export const dynamic = 'force-dynamic';

export default async function CuratorQueuePage() {
  const c = await getCuratorSession();
  if (!c) redirect('/curator/signin');

  const jobs = await prisma.menuImportJob.findMany({
    where: { status: 'PENDING_CURATOR' },
    orderBy: { submittedAt: 'asc' },
    include: {
      vendor: { select: { id: true, name: true, slug: true, hub: true } },
      images: { select: { id: true, ord: true } },
    },
  });

  return (
    <CuratorShell name={c.name}>
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Curator queue</div>
        <h1 className="mt-2 font-serif text-[34px] sm:text-[42px] leading-[1.02] tracking-[-0.02em]">
          Menus waiting for <span className="italic text-[color:var(--color-forest)]">your eyes.</span>
        </h1>
        <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)]">
          Each row is a vendor&apos;s bulk menu upload. Open one, compare the OCR&apos;d items against the photo, fix what&apos;s wrong, then forward to admin.
        </p>
      </div>

      <ul className="mt-7 space-y-3">
        {jobs.length === 0 && (
          <li className="rounded-2xl border border-dashed border-[color:var(--color-ink)]/15 p-10 text-center text-[14px] text-[color:var(--color-ink-soft)]/70">
            No menus waiting. Beautiful.
          </li>
        )}
        {jobs.map((j) => {
          const itemCount = Array.isArray(j.items) ? (j.items as unknown[]).length : 0;
          return (
            <li key={j.id}>
              <Link
                href={`/curator/${j.id}`}
                className="block rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-5 hover:border-[color:var(--color-forest)]/35 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/65">
                      {j.source} · {j.categorySlug.replace(/-/g, ' ')}
                    </div>
                    <div className="font-serif text-[20px] leading-tight">{j.vendor.name}</div>
                    <div className="text-[12px] text-[color:var(--color-ink-soft)]">
                      {j.vendor.hub} · {itemCount} item{itemCount === 1 ? '' : 's'} parsed · {j.images.length} photo{j.images.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-[color:var(--color-ink-soft)]/60">
                      Submitted {new Date(j.submittedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="mt-1 text-[12.5px] font-medium text-[color:var(--color-forest)]">Open →</div>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </CuratorShell>
  );
}
