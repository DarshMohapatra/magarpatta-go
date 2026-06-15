/**
 * Static HTML renderer for the agent's report. Self-contained: no Tailwind
 * runtime, no external CSS, no images. Drop the file in any browser and it
 * works.
 */

import type { AgentReport, ItemComparison } from './agent';

function rupee(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function barRow(item: ItemComparison): string {
  const maxPrice = Math.max(
    item.item.priceInr,
    ...item.competitors.map((c) => c.priceInr),
  );
  const bars: string[] = [];
  const all = [
    { source: 'Magarpatta Go', priceInr: item.item.priceInr, us: true, note: undefined as string | undefined },
    ...item.competitors.map((c) => ({ source: c.source, priceInr: c.priceInr, us: false, note: c.note })),
  ].sort((a, b) => a.priceInr - b.priceInr);

  for (const row of all) {
    const pct = (row.priceInr / maxPrice) * 100;
    const cls = row.us ? 'bar bar--us' : 'bar';
    bars.push(`
      <div class="${cls}">
        <span class="bar__label">${row.source}</span>
        <span class="bar__track"><span class="bar__fill" style="width:${pct.toFixed(1)}%"></span></span>
        <span class="bar__price">${rupee(row.priceInr)}</span>
        ${row.note ? `<span class="bar__note">${row.note}</span>` : ''}
      </div>`);
  }
  return bars.join('');
}

function itemSection(comp: ItemComparison): string {
  const wePos = comp.stats.savingsPct;
  const badge =
    wePos >= 25 ? `<span class="badge badge--green">−${wePos}% vs avg</span>` :
    wePos > 0   ? `<span class="badge badge--mint">−${wePos}% vs avg</span>` :
    wePos === 0 ? `<span class="badge badge--neutral">on par</span>` :
                  `<span class="badge badge--warn">+${Math.abs(wePos)}% above avg</span>`;
  return `
    <article class="card">
      <header class="card__head">
        <div>
          <h3 class="card__title">${comp.item.name}</h3>
          <p class="card__unit">${comp.item.unit} · per-kg basis ${rupee(comp.item.pricePerKgInr)}</p>
        </div>
        ${badge}
      </header>
      <div class="card__bars">${barRow(comp)}</div>
      ${comp.highlight ? `<p class="card__highlight">${comp.highlight}</p>` : ''}
      <footer class="card__foot">
        <span>Cheapest competitor: <strong>${comp.stats.cheapestCompetitor.source}</strong> at ${rupee(comp.stats.cheapestCompetitor.priceInr)}</span>
        <span>Avg competitor: <strong>${rupee(comp.stats.avgCompetitorInr)}</strong></span>
        <span>You save: <strong>${rupee(comp.stats.savingsInr)}</strong> / unit</span>
      </footer>
    </article>`;
}

export function renderHtml(report: AgentReport): string {
  const generatedAt = new Date(report.generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const itemsHtml = report.items.map(itemSection).join('\n');
  const insightsHtml = report.rollup.insights.map((i) => `<li>${i}</li>`).join('\n');
  const sourcesHtml = report.meta.competitorSources.map((s) => `<span class="chip">${s}</span>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Magarpatta Go — Price Comparison (demo)</title>
<style>
  :root {
    --ink: #1a1f1c;
    --ink-soft: #545d56;
    --paper: #fbfaf6;
    --cream: #f3f0e6;
    --forest: #0d4a2e;
    --forest-dark: #083a23;
    --saffron: #c97f3e;
    --terracotta: #b54f3b;
    --sage: #b9c6a7;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--paper);
    color: var(--ink);
    line-height: 1.5;
  }
  .page { max-width: 1080px; margin: 0 auto; padding: 32px 24px 80px; }
  .hero { padding: 40px 0 24px; border-bottom: 1px solid rgba(26,31,28,.08); }
  .hero__kicker { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--saffron); margin: 0 0 12px; }
  .hero__title { font-family: "Iowan Old Style", Georgia, serif; font-size: 44px; line-height: 1.04; margin: 0; }
  .hero__title em { color: var(--forest); font-style: italic; }
  .hero__sub { color: var(--ink-soft); margin-top: 16px; max-width: 640px; }
  .hero__meta { color: rgba(84,93,86,.7); font-size: 11.5px; margin-top: 8px; }

  .summary { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin: 32px 0 12px; }
  .stat {
    background: white;
    border: 1px solid rgba(26,31,28,.08);
    border-radius: 16px;
    padding: 20px;
  }
  .stat__label { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-soft); }
  .stat__value { font-family: "Iowan Old Style", Georgia, serif; font-size: 32px; margin-top: 8px; }
  .stat--big .stat__value { color: var(--forest); }
  .stat__note { font-size: 11.5px; color: var(--ink-soft); margin-top: 4px; }

  .insights {
    background: rgba(13,74,46,.05);
    border: 1px solid rgba(13,74,46,.18);
    border-radius: 16px;
    padding: 20px 24px;
    margin: 24px 0 32px;
  }
  .insights h2 { font-family: serif; font-size: 18px; margin: 0 0 8px; }
  .insights ul { margin: 0; padding-left: 20px; font-size: 13.5px; color: var(--ink); }
  .insights li { margin: 6px 0; }

  .chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
  .chip {
    background: white;
    border: 1px solid rgba(26,31,28,.12);
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 11px;
    color: var(--ink-soft);
  }

  .card {
    background: white;
    border: 1px solid rgba(26,31,28,.08);
    border-radius: 18px;
    padding: 18px 20px;
    margin-bottom: 14px;
  }
  .card__head { display: flex; align-items: start; justify-content: space-between; gap: 12px; }
  .card__title { font-family: serif; font-size: 19px; margin: 0; }
  .card__unit { font-size: 12px; color: var(--ink-soft); margin: 2px 0 0; }
  .badge {
    flex-shrink: 0;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
  }
  .badge--green { background: var(--forest); color: white; }
  .badge--mint { background: var(--sage); color: var(--forest-dark); }
  .badge--neutral { background: rgba(26,31,28,.06); color: var(--ink); }
  .badge--warn { background: var(--terracotta); color: white; }

  .card__bars { margin-top: 14px; display: flex; flex-direction: column; gap: 6px; }
  .bar {
    display: grid;
    grid-template-columns: 140px 1fr 80px;
    align-items: center;
    gap: 10px;
    font-size: 12.5px;
  }
  .bar__label { color: var(--ink-soft); }
  .bar__track {
    height: 18px;
    background: rgba(26,31,28,.06);
    border-radius: 6px;
    overflow: hidden;
    position: relative;
  }
  .bar__fill {
    display: block;
    height: 100%;
    background: rgba(13,74,46,.22);
    border-radius: 6px;
  }
  .bar__price { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
  .bar__note {
    grid-column: 2 / -1;
    font-size: 10.5px;
    color: var(--ink-soft);
    font-style: italic;
  }
  .bar--us .bar__label { color: var(--forest-dark); font-weight: 600; }
  .bar--us .bar__fill { background: var(--forest); }
  .bar--us .bar__price { color: var(--forest-dark); }

  .card__highlight {
    margin: 12px 0 0;
    padding: 8px 12px;
    background: rgba(201,127,62,.08);
    border-left: 3px solid var(--saffron);
    border-radius: 4px;
    font-size: 12.5px;
    color: var(--ink);
  }

  .card__foot {
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid rgba(26,31,28,.06);
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 11.5px;
    color: var(--ink-soft);
  }

  .footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid rgba(26,31,28,.08);
    font-size: 11.5px;
    color: var(--ink-soft);
  }
  .footer code { background: rgba(26,31,28,.06); padding: 1px 5px; border-radius: 3px; }
</style>
</head>
<body>
<main class="page">

  <header class="hero">
    <p class="hero__kicker">Magarpatta Go · Price Compare Agent · DEMO</p>
    <h1 class="hero__title">
      Same produce. <em>Lower bill.</em>
    </h1>
    <p class="hero__sub">
      Agent-generated comparison of ${report.rollup.itemsCompared} fresh-produce SKUs
      between Magarpatta Go's wholesale rates and ${report.meta.competitorSources.length}
      competing platforms across Pune.
    </p>
    <p class="hero__meta">
      Generated ${generatedAt} IST · curated price snapshot June 2026 · LLM enrichment ${report.meta.llmEnrichmentUsed ? 'on' : 'off (demo mode)'}
    </p>
    <div class="chip-row">${sourcesHtml}</div>
  </header>

  <section class="summary">
    <div class="stat stat--big">
      <div class="stat__label">Avg. basket savings</div>
      <div class="stat__value">${rupee(report.rollup.basketSavingsInr)}</div>
      <div class="stat__note">${report.rollup.basketSavingsPct}% cheaper than the competitor average across one of each item</div>
    </div>
    <div class="stat">
      <div class="stat__label">Avg savings %</div>
      <div class="stat__value">−${report.rollup.avgSavingsPct}%</div>
      <div class="stat__note">across all ${report.rollup.itemsCompared} produce SKUs</div>
    </div>
    <div class="stat">
      <div class="stat__label">Biggest single win</div>
      <div class="stat__value">−${report.rollup.bestSaver.stats.savingsPct}%</div>
      <div class="stat__note">${report.rollup.bestSaver.item.name} (vs ${rupee(report.rollup.bestSaver.stats.avgCompetitorInr)} avg)</div>
    </div>
    <div class="stat">
      <div class="stat__label">Closest gap</div>
      <div class="stat__value">${report.rollup.weakestSaver.stats.savingsPct >= 0 ? '−' : '+'}${Math.abs(report.rollup.weakestSaver.stats.savingsPct)}%</div>
      <div class="stat__note">${report.rollup.weakestSaver.item.name}</div>
    </div>
  </section>

  <section class="insights">
    <h2>Launch-marketing pull-quotes</h2>
    <ul>${insightsHtml}</ul>
  </section>

  <h2 style="font-family:serif;font-size:24px;margin:32px 0 16px;">Per-item breakdown</h2>
  ${itemsHtml}

  <footer class="footer">
    Demo build — competitor prices from a hand-curated June 2026 sweep of public listings.
    Swap in live data later by wiring an LLM or scraper into <code>agent.ts → enrichWithLLM()</code>.
  </footer>
</main>
</body>
</html>`;
}
