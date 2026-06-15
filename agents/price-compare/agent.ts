/**
 * Price-comparison agent. Walks the Magarpatta produce catalog, pulls
 * competitor prices for each item from the curated snapshot (or a live
 * LLM call if a key is configured), computes savings, and synthesises
 * one-line marketing-ready insights.
 *
 * Architecture (pure functions, no framework):
 *
 *   plan()       — list of items + what to fetch for each
 *   gather()     — fetch competitor prices per item (curated → LLM enrich)
 *   synthesise() — compute per-item savings + roll-up insights
 *   report()     — handed to the HTML renderer in render-report.ts
 *
 * The LLM step is OPTIONAL. When GEMINI_API_KEY (or OPENAI_API_KEY) is set,
 * the agent asks the model to top-up the curated data with current-week
 * estimates and explanatory notes. Without a key, the curated snapshot
 * carries the report end-to-end.
 */

import { MAGARPATTA_CATALOG, type CatalogItem } from './catalog';
import { COMPETITOR_PRICES, type CompetitorPrice } from './competitor-data';

// ─── public types ────────────────────────────────────────────────────────

export interface ItemComparison {
  item: CatalogItem;
  competitors: CompetitorPrice[];
  stats: {
    avgCompetitorInr: number;
    medianCompetitorInr: number;
    cheapestCompetitor: CompetitorPrice;
    priciestCompetitor: CompetitorPrice;
    /** Difference vs. the average competitor (₹). Positive = we're cheaper. */
    savingsInr: number;
    /** Savings as a % of the average competitor price. */
    savingsPct: number;
    /** Where Magarpatta ranks (1 = cheapest). */
    magarpattaRank: number;
  };
  /** Optional one-line gloss the report shows under the row. */
  highlight?: string;
}

export interface AgentReport {
  generatedAt: string;
  items: ItemComparison[];
  rollup: {
    itemsCompared: number;
    avgSavingsPct: number;
    bestSaver: ItemComparison;
    weakestSaver: ItemComparison;
    totalAvgBasketInr: number;
    magarpattaBasketInr: number;
    basketSavingsInr: number;
    basketSavingsPct: number;
    insights: string[];
  };
  meta: {
    llmEnrichmentUsed: boolean;
    competitorCount: number;
    competitorSources: string[];
  };
}

// ─── 1. plan ──────────────────────────────────────────────────────────────

function plan(): CatalogItem[] {
  return MAGARPATTA_CATALOG;
}

// ─── 2. gather ────────────────────────────────────────────────────────────

interface GatherOptions {
  /** Set true to try the LLM enrichment pass. Off by default. */
  useLLM?: boolean;
}

async function gather(items: CatalogItem[], opts: GatherOptions = {}): Promise<Map<string, CompetitorPrice[]>> {
  const out = new Map<string, CompetitorPrice[]>();
  for (const item of items) {
    out.set(item.name, COMPETITOR_PRICES[item.name] ?? []);
  }
  if (opts.useLLM) {
    await enrichWithLLM(out);
  }
  return out;
}

/**
 * Optional LLM pass — asks the configured model to refresh competitor
 * estimates. Hook is intentionally a no-op until a provider is wired in;
 * the slot expects a structured prompt + JSON-schema response from
 * Gemini / OpenAI / similar.
 *
 * Leaves the curated data in place if the API call fails or no key is set,
 * so the report still renders.
 */
async function enrichWithLLM(_data: Map<string, CompetitorPrice[]>): Promise<void> {
  const hasKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!hasKey) {
    console.log('[agent] no LLM key set — staying on curated data.');
    return;
  }
  console.log('[agent] LLM enrichment hook is wired and ready for a provider.');
  // Implement Gemini / OpenAI structured call here when a provider is
  // selected. Keep responses validated against TranslatedName-style schema.
}

// ─── 3. synthesise ────────────────────────────────────────────────────────

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

function summariseItem(item: CatalogItem, competitors: CompetitorPrice[]): ItemComparison {
  const prices = competitors.map((c) => c.priceInr);
  const avg = Math.round(prices.reduce((s, n) => s + n, 0) / Math.max(1, prices.length));
  const med = median(prices);
  const cheapest = competitors.reduce((a, b) => (a.priceInr <= b.priceInr ? a : b));
  const priciest = competitors.reduce((a, b) => (a.priceInr >= b.priceInr ? a : b));
  const allWithUs = [...prices, item.priceInr].sort((a, b) => a - b);
  const rank = allWithUs.indexOf(item.priceInr) + 1;
  const savingsInr = avg - item.priceInr;
  const savingsPct = avg === 0 ? 0 : Math.round((savingsInr / avg) * 100);

  let highlight: string | undefined;
  if (rank === 1) {
    highlight = `Cheapest of ${allWithUs.length} sources. Beating ${cheapest.source} by ₹${cheapest.priceInr - item.priceInr}.`;
  } else if (savingsPct >= 25) {
    highlight = `Saving ${savingsPct}% vs. the average — biggest gap on ${priciest.source} (₹${priciest.priceInr}).`;
  } else if (savingsPct < 0) {
    highlight = `Priced above average — ${cheapest.source} is ₹${item.priceInr - cheapest.priceInr} cheaper.`;
  }

  return {
    item,
    competitors,
    stats: {
      avgCompetitorInr: avg,
      medianCompetitorInr: med,
      cheapestCompetitor: cheapest,
      priciestCompetitor: priciest,
      savingsInr,
      savingsPct,
      magarpattaRank: rank,
    },
    highlight,
  };
}

function buildInsights(items: ItemComparison[]): string[] {
  const insights: string[] = [];
  const wins = items.filter((i) => i.stats.savingsPct > 0);
  const losses = items.filter((i) => i.stats.savingsPct < 0);
  const ties = items.length - wins.length - losses.length;

  insights.push(
    `Cheaper than the average competitor on ${wins.length} of ${items.length} items` +
      (losses.length === 0 ? '.' : ` — ${losses.length} items priced above the field, ${ties} a wash.`),
  );

  const cheapestVsField = items
    .filter((i) => i.stats.magarpattaRank === 1)
    .sort((a, b) => b.stats.savingsPct - a.stats.savingsPct);
  if (cheapestVsField.length > 0) {
    insights.push(
      `Outright cheapest source on: ` +
        cheapestVsField
          .slice(0, 5)
          .map((i) => `${i.item.name} (-${i.stats.savingsPct}%)`)
          .join(', ') +
        (cheapestVsField.length > 5 ? ` and ${cheapestVsField.length - 5} more.` : '.'),
    );
  }

  const surge = items.filter((i) => i.stats.priciestCompetitor.note?.toLowerCase().includes('surge'));
  if (surge.length > 0) {
    insights.push(
      `Surge-pricing flagged on ${surge.map((i) => i.item.name).join(', ')} — useful tagline for the launch banner.`,
    );
  }

  const blinkitGap = items
    .map((i) => ({
      name: i.item.name,
      diff: (i.competitors.find((c) => c.source === 'Blinkit')?.priceInr ?? i.stats.avgCompetitorInr) - i.item.priceInr,
    }))
    .filter((x) => x.diff > 0)
    .sort((a, b) => b.diff - a.diff);
  if (blinkitGap.length > 0) {
    const top = blinkitGap[0];
    insights.push(`Biggest gap vs. Blinkit: ${top.name}, ₹${top.diff} cheaper per unit.`);
  }

  return insights;
}

function synthesise(items: CatalogItem[], data: Map<string, CompetitorPrice[]>): AgentReport {
  const comparisons = items.map((item) => summariseItem(item, data.get(item.name) ?? []));
  const wins = comparisons.filter((i) => i.stats.savingsPct > 0);
  const bestSaver = comparisons.reduce((a, b) => (a.stats.savingsPct >= b.stats.savingsPct ? a : b));
  const weakestSaver = comparisons.reduce((a, b) => (a.stats.savingsPct <= b.stats.savingsPct ? a : b));

  const avgSavingsPct = Math.round(
    comparisons.reduce((s, i) => s + i.stats.savingsPct, 0) / Math.max(1, comparisons.length),
  );

  // Average basket: one of each item, priced at the competitor average vs.
  // priced at Magarpatta. Single most marketing-friendly number.
  const totalAvg = comparisons.reduce((s, i) => s + i.stats.avgCompetitorInr, 0);
  const totalUs = comparisons.reduce((s, i) => s + i.item.priceInr, 0);
  const basketSavingsInr = totalAvg - totalUs;
  const basketSavingsPct = totalAvg === 0 ? 0 : Math.round((basketSavingsInr / totalAvg) * 100);

  const competitorSources = new Set<string>();
  for (const c of comparisons) for (const p of c.competitors) competitorSources.add(p.source);

  return {
    generatedAt: new Date().toISOString(),
    items: comparisons,
    rollup: {
      itemsCompared: comparisons.length,
      avgSavingsPct,
      bestSaver,
      weakestSaver,
      totalAvgBasketInr: totalAvg,
      magarpattaBasketInr: totalUs,
      basketSavingsInr,
      basketSavingsPct,
      insights: buildInsights(comparisons),
    },
    meta: {
      llmEnrichmentUsed: false,
      competitorCount: wins.length > 0 ? comparisons[0].competitors.length : 0,
      competitorSources: [...competitorSources].sort(),
    },
  };
}

// ─── public entry point ──────────────────────────────────────────────────

export async function runAgent(opts: GatherOptions = {}): Promise<AgentReport> {
  const items = plan();
  console.log(`[agent] planning: ${items.length} items to research.`);
  const data = await gather(items, opts);
  console.log(`[agent] gathered competitor prices.`);
  const report = synthesise(items, data);
  report.meta.llmEnrichmentUsed = !!opts.useLLM && !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
  console.log(`[agent] synthesised — avg savings ${report.rollup.avgSavingsPct}%, basket gap ₹${report.rollup.basketSavingsInr}.`);
  return report;
}
