'use client';

import { useState } from 'react';

export function ArticleFeedback({ articleId }: { articleId: string }) {
  const [submitted, setSubmitted] = useState<'helpful' | 'not-helpful' | null>(null);
  const [busy, setBusy] = useState(false);

  async function vote(helpful: boolean) {
    if (busy || submitted) return;
    setBusy(true);
    try {
      await fetch(`/api/help/articles/${articleId}/feedback`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ helpful }),
      });
      setSubmitted(helpful ? 'helpful' : 'not-helpful');
    } catch {
      // best-effort — feedback is non-critical
      setSubmitted(helpful ? 'helpful' : 'not-helpful');
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <p className="text-[13px] text-[color:var(--color-ink-soft)]">
        {submitted === 'helpful' ? 'Glad it helped — thanks for letting us know.' : 'Thanks — we\'ll work on improving this article.'}
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-[13px] text-[color:var(--color-ink-soft)]">Was this helpful?</span>
      <button
        onClick={() => vote(true)}
        disabled={busy}
        className="px-3.5 py-1.5 rounded-full border border-[color:var(--color-ink)]/14 text-[12.5px] hover:bg-[color:var(--color-paper)] disabled:opacity-50"
      >Yes</button>
      <button
        onClick={() => vote(false)}
        disabled={busy}
        className="px-3.5 py-1.5 rounded-full border border-[color:var(--color-ink)]/14 text-[12.5px] hover:bg-[color:var(--color-paper)] disabled:opacity-50"
      >No</button>
    </div>
  );
}
