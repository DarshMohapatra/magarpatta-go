'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TICKET_CATEGORY_LABEL } from '@/lib/support-tickets';
import type { TicketCategory } from '@prisma/client';

interface ArticleDraft {
  id?: string;
  slug?: string;
  title: string;
  body: string;
  category: TicketCategory | null;
  tags: string[];
  isPublic: boolean;
  archived?: boolean;
}

const CATEGORY_OPTIONS: TicketCategory[] = [
  'WRONG_ITEM','MISSING_ITEM','QUALITY','LATE_DELIVERY',
  'RIDER_BEHAVIOUR','PAYMENT','REFUND','ACCOUNT','OTHER',
];

export function ArticleEditor({ initial }: { initial: ArticleDraft }) {
  const router = useRouter();
  const isNew = !initial.id;
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [category, setCategory] = useState<TicketCategory | ''>(initial.category ?? '');
  const [tagsInput, setTagsInput] = useState(initial.tags.join(', '));
  const [isPublic, setIsPublic] = useState(initial.isPublic);
  const [archived, setArchived] = useState(initial.archived ?? false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function readTags(): string[] {
    return tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
  }

  async function save() {
    setBusy(true); setErr(null);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        category: category || null,
        tags: readTags(),
        isPublic,
        ...(isNew ? {} : { archived }),
      };
      const url = isNew ? '/api/admin/kb' : `/api/admin/kb/${initial.id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) { setErr(data.error ?? 'Could not save'); return; }
      router.push('/admin/kb');
      router.refresh();
    } catch { setErr('Network error'); }
    finally { setBusy(false); }
  }

  async function archiveNow() {
    if (!initial.id) return;
    if (!confirm('Archive this article? Helpdesk will no longer see it as a suggestion.')) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/kb/${initial.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.ok) { setErr(data.error ?? 'Could not archive'); return; }
      router.push('/admin/kb'); router.refresh();
    } catch { setErr('Network error'); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
      <div>
        <Link href="/admin/kb" className="text-[12px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]">← Articles</Link>
        <div className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">
          {isNew ? 'New article' : 'Edit article'}
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={160}
          placeholder="Article title — short and searchable"
          className="mt-3 w-full bg-transparent border-0 border-b border-[color:var(--color-ink)]/14 focus:border-[color:var(--color-forest)] outline-none font-serif text-[28px] lg:text-[36px] leading-[1.1] tracking-[-0.01em] py-2"
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={20}
          maxLength={20000}
          placeholder={`Write the article. Markdown is supported.\n\n# Steps\n1. …`}
          className="mt-6 w-full bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 rounded-2xl px-4 py-4 text-[14px] leading-[1.6] outline-none focus:border-[color:var(--color-forest)] resize-y font-mono"
        />

        {err ? <div className="mt-3 text-[12.5px] text-[color:var(--color-terracotta)]">{err}</div> : null}

        <div className="mt-4 flex justify-end gap-2">
          {!isNew ? (
            <button
              onClick={archiveNow}
              disabled={busy}
              className="px-4 py-2.5 rounded-full border border-[color:var(--color-terracotta)]/30 text-[12.5px] text-[color:var(--color-terracotta)] hover:bg-[color:var(--color-terracotta)]/8 disabled:opacity-50"
            >Archive</button>
          ) : null}
          <button
            onClick={save}
            disabled={busy || title.trim().length < 3 || body.trim().length < 20}
            className="px-5 py-2.5 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] text-[12.5px] font-medium hover:bg-[color:var(--color-forest-dark)] transition-colors disabled:opacity-50"
          >{busy ? 'Saving…' : isNew ? 'Publish article' : 'Save changes'}</button>
        </div>
      </div>

      <aside className="space-y-3">
        <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-2">Category</div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TicketCategory | '')}
            className="w-full bg-[color:var(--color-cream)] border border-[color:var(--color-ink)]/14 rounded-xl px-3 py-2 text-[13px] outline-none"
          >
            <option value="">— None —</option>
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{TICKET_CATEGORY_LABEL[c]}</option>)}
          </select>
          <p className="mt-2 text-[11px] text-[color:var(--color-ink-soft)]">
            Articles with the same category as a ticket get a +5 ranking bump.
          </p>
        </div>

        <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-2">Tags</div>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="comma, separated, list"
            className="w-full bg-[color:var(--color-cream)] border border-[color:var(--color-ink)]/14 rounded-xl px-3 py-2 text-[13px] outline-none"
          />
        </div>

        <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
          <label className="flex items-center gap-2 text-[12.5px] cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            <span>Public (publish at /help)</span>
          </label>
          {!isNew ? (
            <label className="mt-2 flex items-center gap-2 text-[12.5px] cursor-pointer">
              <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
              <span>Archived</span>
            </label>
          ) : null}
        </div>

        {!isNew && initial.slug ? (
          <div className="bg-[color:var(--color-paper)] rounded-2xl border border-[color:var(--color-ink)]/10 p-4">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)] mb-1">Permalink</div>
            <Link href={`/help/${initial.slug}`} target="_blank" className="text-[12.5px] underline">/help/{initial.slug}</Link>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
