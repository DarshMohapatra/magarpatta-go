# Price Compare Agent

Walks the Magarpatta Go produce catalog, pulls competitor prices for each item
(Blinkit, Zepto, BigBasket, JioMart, Swiggy Instamart), computes savings, and
renders a self-contained HTML report.

Lives outside `apps/web/` — runs locally, generates static output. The customer
site reads competitor prices from a Postgres table (`CompetitorPriceSnapshot`),
seeded from the same dictionary that powers this report.

## Run it

From the repo root:

```bash
pnpm --filter @magarpatta/web exec tsx ../../agents/price-compare/run.ts
```

or, if you'd rather not go through the workspace:

```bash
cd agents/price-compare
pnpm dlx tsx run.ts
```

You'll see:

```
[run] starting price-compare agent…
[agent] planning: 13 items to research.
[agent] no LLM key set — staying on curated data.
[agent] gathered competitor prices.
[agent] synthesised — avg savings 17%, basket gap ₹185.
[run] JSON written: …/output/report.json
[run] HTML written: …/output/ai_agent_report.html
[run] open it: file://…/output/ai_agent_report.html
```

Open the `ai_agent_report.html` URL in any browser.

## What you get

- **Hero band** with headline "Same produce. Lower bill."
- **Summary cards**: avg basket savings, avg %, biggest win, closest gap
- **Pull-quotes**: ready-to-use one-liners for marketing surfaces
- **Per-item breakdown**: each SKU with horizontal bars comparing Magarpatta Go
  to every competitor, plus a highlight callout when we beat them outright

## How the agent is structured

`agent.ts` exposes one function — `runAgent({ useLLM })` — that walks four phases:

1. **plan()** — list items from `catalog.ts`
2. **gather()** — pull competitor prices per item from `competitor-data.ts`
3. **enrichWithLLM()** — optional live-data pass (hook for Gemini / OpenAI)
4. **synthesise()** — compute savings + roll-up insights

Pure functions, no framework. Trivial to test, trivial to extend.

## Swapping curated data for live data

Two paths:

1. **LLM enrichment** (lower effort, lower accuracy)
   - Fill in `enrichWithLLM()` in `agent.ts`
   - Prompt the model for current-week prices in Pune
   - Cache responses so the daily quota holds
   - Set `useLLM: true` in `run.ts`

2. **Scraping / partner data feed** (higher effort, higher accuracy)
   - Build a small scraper that respects each platform's robots.txt
   - Run it as a cron, write to `competitor-data.json`
   - Agent reads the JSON instead of the static TypeScript file

## Site integration

The customer site already shows competitor comparisons on each product card
and a basket-savings line at checkout. Both surfaces read from the
`CompetitorPriceSnapshot` Postgres table.

Future automation paths:

- Nightly Vercel Cron (`/api/cron/price-compare`) refreshes the table
- Admin override at `/admin/competitor-prices` lets ops type prices directly
