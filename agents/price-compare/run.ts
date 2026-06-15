/**
 * CLI entry point. Run with:
 *
 *   pnpm dlx tsx agents/price-compare/run.ts
 *
 * (or `pnpm tsx ...` if you already have tsx in the workspace, which the
 * web app does.)
 *
 * Writes two artefacts into `agents/price-compare/output/`:
 *   - report.json — structured agent output for downstream tooling
 *   - demo.html   — self-contained marketing-style comparison page
 *
 * Open demo.html in any browser. No server, no DB, no Vercel deploy.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAgent } from './agent';
import { renderHtml } from './render-report';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'output');

async function main() {
  console.log('[run] starting price-compare agent…');
  // useLLM is off for the demo — flip true once we wire a model in.
  const report = await runAgent({ useLLM: false });

  mkdirSync(OUT_DIR, { recursive: true });

  const jsonPath = join(OUT_DIR, 'report.json');
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`[run] JSON written: ${jsonPath}`);

  const htmlPath = join(OUT_DIR, 'demo.html');
  writeFileSync(htmlPath, renderHtml(report));
  console.log(`[run] HTML written: ${htmlPath}`);
  console.log(`[run] open it: file://${htmlPath.replace(/\\/g, '/')}`);
}

main().catch((e) => {
  console.error('[run] agent failed:', e);
  process.exit(1);
});
