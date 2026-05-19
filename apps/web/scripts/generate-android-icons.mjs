#!/usr/bin/env node
/**
 * Render launcher icons for the Capacitor Android shell. Run AFTER
 * `npx cap add android` / `npx cap sync android` so the freshly-generated
 * mipmap-*/ic_launcher* files exist; this script overwrites them with our
 * brand mark (sourced from apps/web/resources/launcher-icon.svg).
 *
 * What we emit (matching the Android launcher icon spec):
 *   mipmap-mdpi      ic_launcher.png             48 × 48
 *   mipmap-hdpi      ic_launcher.png             72 × 72
 *   mipmap-xhdpi     ic_launcher.png             96 × 96
 *   mipmap-xxhdpi    ic_launcher.png            144 × 144
 *   mipmap-xxxhdpi   ic_launcher.png            192 × 192
 *   (same for ic_launcher_round.png + ic_launcher_foreground.png used by
 *   Android 8+ adaptive icons; foreground is rendered larger inside a
 *   safe-zone so the system can mask/crop without cutting the M.)
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SVG_PATH = path.join(ROOT, 'resources', 'launcher-icon.svg');
const ANDROID_RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');

const DENSITIES = [
  { name: 'mdpi',    size:  48 },
  { name: 'hdpi',    size:  72 },
  { name: 'xhdpi',   size:  96 },
  { name: 'xxhdpi',  size: 144 },
  { name: 'xxxhdpi', size: 192 },
];

// Adaptive-icon foreground layer renders larger inside a 108dp tile, of
// which only the central 72dp is guaranteed visible. We render the source
// art at 75% of the tile so it sits comfortably inside the safe zone.
const FOREGROUND_INSET = 0.25;

async function renderTo(size, outPath, opts = { inset: 0 }) {
  const svg = await fs.readFile(SVG_PATH);
  const renderSize = Math.round(size * (1 - opts.inset * 2));
  const inner = await sharp(svg).resize(renderSize, renderSize).png().toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 13, g: 74, b: 46, alpha: 1 }, // forest, for foreground transparency case
    },
  })
    .composite([{ input: inner, gravity: 'center' }])
    .png()
    .toFile(outPath);
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function main() {
  console.log('Generating Android launcher icons from', SVG_PATH);
  try {
    await fs.access(ANDROID_RES);
  } catch {
    console.error(`Android res dir not found at ${ANDROID_RES}.\nRun \`npx cap add android && npx cap sync android\` first.`);
    process.exit(1);
  }

  for (const d of DENSITIES) {
    const dir = path.join(ANDROID_RES, `mipmap-${d.name}`);
    await ensureDir(dir);
    // Standard square icon (older Android uses this directly)
    await renderTo(d.size, path.join(dir, 'ic_launcher.png'));
    // "Round" variant — Android pre-26 picks this on round-icon launchers
    await renderTo(d.size, path.join(dir, 'ic_launcher_round.png'));
    // Adaptive-icon foreground layer (Android 8+) — inset for the safe zone
    // The system will composite this on top of the background colour defined
    // in mipmap-anydpi-v26/ic_launcher.xml. Capacitor sets that XML on `cap
    // add android`; we leave it alone.
    await renderTo(d.size, path.join(dir, 'ic_launcher_foreground.png'), { inset: FOREGROUND_INSET });
    console.log(`  ✓ mipmap-${d.name}: ic_launcher / _round / _foreground`);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
