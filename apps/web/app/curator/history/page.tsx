import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCuratorSession } from '@/lib/curator-session';
import { CuratorShell } from '@/components/curator/curator-shell';

export const dynamic = 'force-dynamic';

export default async function CuratorHistoryPage() {
  const c = await getCuratorSession();
  if (!c) redirect('/curator/signin');

  const jobs = await prisma.menuImportJob.findMany({
    where: { status: { in: ['CURATED', 'REJECTED'] } },
    orderBy: { curatedAt: 'desc' },
    take: 60,
    include: { vendor: { select: { name: true, hub: true } } },
  });

  return (
    <CuratorShell name={c.name}>
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">History</div>
        <h1 className="mt-2 font-serif text-[34px] leading-[1.02] tracking-[-0.02em]">
          Your last <span className="italic text-[color:var(--color-forest)]">{jobs.length} reviews.</span>
        </h1>
      </div>

      <ul className="mt-7 divide-y divide-[color:var(--color-ink)]/8 rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] overflow-hidden">
        {jobs.length === 0 && (
          <li className="px-6 py-10 text-center text-[14px] text-[color:var(--color-ink-soft)]/70">No history yet.</li>
        )}
        {jobs.map((j) => {
          const itemCount = Array.isArray(j.items) ? (j.items as unknown[]).length : 0;
          const tone = j.status === 'CURATED' ? 'forest' : 'terracotta';
          return (
            <li key={j.id}>
              <Link href={`/curator/${j.id}`} className="block px-5 py-4 hover:bg-[color:var(--color-cream)]/40">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-serif text-[16px]">{j.vendor.name}</div>
                    <div className="text-[11.5px] text-[color:var(--color-ink-soft)]">
                      {j.vendor.hub} · {itemCount} item{itemCount === 1 ? '' : 's'} · {j.source}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] uppercase tracking-[0.14em] ${
                      tone === 'forest'
                        ? 'bg-[color:var(--color-forest)]/12 text-[color:var(--color-forest)]'
                        : 'bg-[color:var(--color-terracotta)]/10 text-[color:var(--color-terracotta)]'
                    }`}>{j.status.toLowerCase()}</span>
                    <span className="text-[11px] text-[color:var(--color-ink-soft)]/65">
                      {j.curatedAt ? new Date(j.curatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
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
