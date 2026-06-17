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
      {/* Gradient-warm hero — partner parity */}
      <div className="relative overflow-hidden rounded-[var(--radius-2xl)] gradient-warm text-white p-5 sm:p-6 shadow-[var(--shadow-glow)]">
        <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="relative">
          <div className="text-[10.5px] uppercase tracking-[0.18em] font-semibold opacity-90">Curator queue</div>
          <h1 className="mt-2 font-display text-[26px] sm:text-[30px] leading-tight tracking-tight">
            Menus waiting for your eyes.
          </h1>
          <p className="mt-1 text-[12.5px] opacity-90">
            {jobs.length === 0
              ? 'Inbox zero. Beautiful.'
              : `${jobs.length} upload${jobs.length === 1 ? '' : 's'} pending review`}
          </p>
        </div>
      </div>

      <ul className="mt-6 space-y-3">
        {jobs.length === 0 && (
          <li className="rounded-2xl border border-dashed border-[color:var(--color-foreground)]/15 p-10 text-center text-[14px] text-[color:var(--color-muted)]/70">
            No menus waiting. Beautiful.
          </li>
        )}
        {jobs.map((j) => {
          const itemCount = Array.isArray(j.items) ? (j.items as unknown[]).length : 0;
          return (
            <li key={j.id}>
              <Link
                href={`/curator/${j.id}`}
                className="block rounded-[var(--radius-xl)] border border-[color:var(--color-border)]/60 bg-[color:var(--color-surface)] p-4 sm:p-5 shadow-[var(--shadow-soft)] hover:border-[color:var(--color-primary)]/35 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-muted)]/65">
                      {j.source} · {j.categorySlug.replace(/-/g, ' ')}
                    </div>
                    <div className="font-display text-[20px] leading-tight">{j.vendor.name}</div>
                    <div className="text-[12px] text-[color:var(--color-muted)]">
                      {j.vendor.hub} · {itemCount} item{itemCount === 1 ? '' : 's'} parsed · {j.images.length} photo{j.images.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-[color:var(--color-muted)]/60">
                      Submitted {new Date(j.submittedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="mt-1 text-[12.5px] font-medium text-[color:var(--color-primary)]">Open →</div>
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
