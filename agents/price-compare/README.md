# Price Compare Agent — demo

Walks the Magarpatta Go produce catalog, pulls competitor prices for each item
(Blinkit, Zepto, BigBasket, JioMart, Swiggy Instamart, local kirana), computes
savings, and renders a marketing-style HTML page.

**Not deployed.** Lives outside `apps/web/` on purpose — runs locally, generates
static output. We integrate after you sign off on the demo.

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
[run] HTML written: …/output/demo.html
[run] open it: file://…/output/demo.html
```

Open the `demo.html` URL in any browser.

## What you get

- **Hero band** with headline "Same produce. Lower bill."
- **Summary cards**: avg basket savings, avg %, biggest win, closest gap
- **Launch-marketing pull-quotes**: ready-to-use one-liners for ads / social
- **Per-item breakdown**: each SKU with horizontal bars comparing Magarpatta Go
  to every competitor, plus a highlight callout when we beat them outright

## How the agent is structured

`agent.ts` exposes one function — `runAgent({ useLLM })` — that walks four phases:

1. **plan()** — list items from `catalog.ts`
2. **gather()** — pull competitor prices per item from `competitor-data.ts`
3. **enrichWithLLM()** — *optional* live-data pass (stubbed; hook for Gemini/OpenAI)
4. **synthesise()** — compute savings + roll-up insights

Pure functions, no framework. Trivial to test, trivial to extend.

## Swapping curated data for live data

Two paths:

1. **LLM enrichment** (lower effort, lower accuracy)
   - Fill in `enrichWithLLM()` in `agent.ts`
   - Prompt the model for current-week prices in Pune
   - Cache responses so we don't burn quota
   - Set `useLLM: true` in `run.ts`

2. **Scraping / partner data feed** (higher effort, higher accuracy)
   - Build a small scraper that respects each platform's robots.txt
   - Run it as a cron, write to `competitor-data.json`
   - Agent reads the JSON instead of the static TypeScript file

## Integrating into the customer site

Once we're happy with the demo:

- Run the agent nightly via Vercel Cron (`/api/cron/price-compare`)
- Persist results to a `CompetitorPriceSnapshot` Prisma model
- Surface on each product card: "₹X cheaper than Blinkit" badge
- Dedicated `/why-cheaper` page using the same report data

That's the integration plan — but we don't touch anything in `apps/web/` until
you give the go-ahead.
