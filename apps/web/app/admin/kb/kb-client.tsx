'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TICKET_CATEGORY_LABEL } from '@/lib/support-tickets';
import type { TicketCategory } from '@prisma/client';

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  category: TicketCategory | null;
  tags: string[];
  isPublic: boolean;
  archived: boolean;
  helpfulCount: number;
  notHelpfulCount: number;
  updatedAt: string;
}

export function AdminKbClient() {
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/kb${includeArchived ? '?archived=1' : ''}`, { cache: 'no-store' });
      const body = await res.json();
      if (!body.ok) { setErr(body.error ?? 'Could not load'); setLoading(false); return; }
      setRows(body.articles); setErr(null);
    } catch { setErr('Network error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [includeArchived]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Knowledge base</div>
          <h1 className="mt-2 font-serif text-[36px] leading-[1.05] tracking-[-0.01em]">
            Articles, <span className="italic text-[color:var(--color-forest)]">canon.</span>
          </h1>
          <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)]">
            Helpdesk agents see suggestions on every ticket. Public articles are also published at <code className="text-[12px]">/help</code>.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIncludeArchived((v) => !v)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] border transition-colors ${
              includeArchived
                ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] border-transparent'
                : 'bg-[color:var(--color-paper)] text-[color:var(--color-ink-soft)] border-[color:var(--color-ink)]/14 hover:text-[color:var(--color-ink)]'
            }`}
          >
            {includeArchived ? 'Hide archived' : 'Show archived'}
          </button>
          <Link
            href="/admin/kb/new"
            className="px-4 py-2 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] text-[12.5px] font-medium hover:bg-[color:var(--color-forest-dark)] transition-colors"
          >
            New article
          </Link>
        </div>
      </div>

      {err ? <div className="mt-6 text-[12.5px] text-[color:var(--color-terracotta)]">{err}</div> : null}
      {loading ? <div className="mt-10 text-[13px] text-[color:var(--color-ink-soft)]">Loading…</div> : null}

      {!loading && rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-10 text-center">
          <p className="font-serif text-[24px]">Empty shelf.</p>
          <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)]">
            Write the first article — agents will get it as a suggestion the moment a related ticket comes in.
          </p>
        </div>
      ) : null}

      {!loading && rows.length > 0 ? (
        <ul className="mt-6 bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 divide-y divide-[color:var(--color-ink)]/8 overflow-hidden">
          {rows.map((a) => (
            <li key={a.id}>
              <Link href={`/admin/kb/${a.id}`} className="block px-5 py-4 hover:bg-[color:var(--color-cream)] transition-colors">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-[14.5px]">{a.title}</span>
                  {a.archived ? <span className="text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-terracotta)]">archived</span> : null}
                  {!a.isPublic ? <span className="text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-saffron)]">internal</span> : null}
                </div>
                <div className="mt-1 text-[12px] text-[color:var(--color-ink-soft)]">
                  /{a.slug}
                  {a.category ? ` · ${TICKET_CATEGORY_LABEL[a.category]}` : ''}
                  {a.tags.length ? ` · ${a.tags.join(', ')}` : ''}
                </div>
                <div className="mt-1 text-[11.5px] text-[color:var(--color-ink-soft)]">
                  Updated {new Date(a.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {' · '}{a.helpfulCount} helpful · {a.notHelpfulCount} not
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
