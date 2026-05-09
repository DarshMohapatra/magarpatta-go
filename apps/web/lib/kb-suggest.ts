import 'server-only';
import type { KbArticle, TicketCategory } from '@prisma/client';
import { prisma } from './prisma';

// Trimmed English stopword list — the bigger NLTK list is overkill for
// suggesting from a few hundred articles and adds bundle weight.
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','if','then','of','to','in','on','for','with','is','are','was',
  'were','it','this','that','my','your','our','their','as','at','be','been','have','has','had',
  'do','does','did','not','no','so','can','could','would','should','will','about','from','i','we',
  'you','they','me','us','them','am','m','s','t','re','ve','ll','d',
]);

function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  for (const tok of text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)) {
    if (tok.length >= 3 && !STOP_WORDS.has(tok)) out.add(tok);
  }
  return out;
}

/**
 * Phase-1 KB suggester: lexical overlap.
 *   - +3 per token hit in title
 *   - +2 per token hit in tags
 *   - +1 per token hit in body
 *   - +5 boost if article.category equals ticket category
 *
 * Returns the top N scoring articles. Phase 2 plan: replace with embedding
 * similarity + a small LLM rerank — the interface stays the same so callers
 * don't have to change.
 */
export async function suggestArticlesForTicket(args: {
  ticketSubject: string;
  ticketCategory: TicketCategory;
  ticketBody: string;
  excludeArticleIds?: string[];
  limit?: number;
}): Promise<KbArticle[]> {
  const tokens = tokenize(`${args.ticketSubject} ${args.ticketBody}`);
  if (tokens.size === 0) return [];

  const articles = await prisma.kbArticle.findMany({
    where: {
      archived: false,
      ...(args.excludeArticleIds?.length
        ? { id: { notIn: args.excludeArticleIds } }
        : {}),
    },
  });

  const scored: Array<{ article: KbArticle; score: number }> = [];
  for (const a of articles) {
    let score = 0;
    const title = a.title.toLowerCase();
    const body  = a.body.toLowerCase();
    const tagsLower = a.tags.map((t) => t.toLowerCase());
    for (const t of tokens) {
      if (title.includes(t)) score += 3;
      if (body.includes(t))  score += 1;
      if (tagsLower.some((tag) => tag.includes(t))) score += 2;
    }
    if (a.category === args.ticketCategory) score += 5;
    if (score > 0) scored.push({ article: a, score });
  }

  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, args.limit ?? 5).map((s) => s.article);
}
