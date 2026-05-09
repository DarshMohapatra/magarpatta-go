import type { SiteConfig, SiteBuilding, SiteSociety } from './types';

// ── helpers (lifted from lib/societies.ts) ──────────────────────────────

function bld(name: string, floors: number, flatsPerFloor: number): SiteBuilding {
  return { name, floors, flatsPerFloor };
}

function letters(start: number, count: number, prefix: string, floors: number, fpf: number, suffix = ''): SiteBuilding[] {
  return Array.from({ length: count }, (_, i) =>
    bld(`${prefix} ${String.fromCharCode(start + i)}${suffix}`, floors, fpf),
  );
}

function plots(count: number, prefix: string): SiteBuilding[] {
  return Array.from({ length: count }, (_, i) => bld(`${prefix} ${i + 1}`, 2, 1));
}

// ── apartment + villa clusters ──────────────────────────────────────────

const SOCIETIES: SiteSociety[] = [
  {
    name: 'Daffodils',
    kind: 'apartment',
    buildings: [
      bld('Daffodils A', 11, 4),
      bld('Daffodils B — Wing A', 11, 4),
      bld('Daffodils B — Wing B', 11, 4),
      bld('Daffodils C', 11, 4),
      bld('Daffodils D', 6, 4),
      bld('Daffodils E', 6, 4),
      bld('Daffodils F', 6, 4),
      bld('Daffodils G', 6, 4),
    ],
  },
  {
    name: 'Grevillea',
    kind: 'apartment',
    buildings: [
      ...letters(65, 8, 'Grevillea', 6, 4),   // A–H: 6F
      ...letters(73, 4, 'Grevillea', 7, 4),   // I–L: 7F
      ...letters(77, 2, 'Grevillea', 11, 4),  // M–N: 11F
    ],
  },
  {
    name: 'Heliconia',
    kind: 'apartment',
    buildings: [
      ...letters(65, 6, 'Heliconia', 5, 6),   // A–F: 5F (1 BHK, 6/floor)
      ...letters(71, 18, 'Heliconia', 6, 6),  // G–X: 6F (1 BHK)
    ],
  },
  {
    name: 'Cosmos',
    kind: 'apartment',
    buildings: [
      ...letters(65, 13, 'Cosmos', 7, 4),   // A–M: 7F
      ...letters(78, 10, 'Cosmos', 9, 4),   // N–W: 9F
      bld('Cosmos X', 11, 4),
    ],
  },
  {
    name: 'Iris',
    kind: 'apartment',
    buildings: [
      ...letters(65, 12, 'Iris', 9, 4),    // A–L: 9F
      ...letters(77, 8, 'Iris', 11, 4),    // M–T: 11F
    ],
  },
  {
    name: 'Jasminium',
    kind: 'apartment',
    verified: true,
    buildings: [
      ...letters(65, 22, 'Jasminium', 9, 4),             // A–V: 9F (resident-verified)
      ...letters(65, 9, 'Jasminium', 11, 4, '1'),        // A1–I1: 11F
    ],
  },
  {
    name: 'Roystonea',
    kind: 'apartment',
    buildings: [
      ...letters(65, 8, 'Roystonea', 9, 4),   // A–H: 9F
      ...letters(73, 6, 'Roystonea', 11, 4),  // I–N: 11F
    ],
  },
  {
    name: 'Laburnum Park',
    kind: 'apartment',
    buildings: letters(65, 16, 'Laburnum Park', 11, 3), // A–P: 11F (3-4 BHK, 3/floor)
  },
  {
    name: 'Sylvania',
    kind: 'apartment',
    buildings: [
      ...letters(65, 4, 'Sylvania', 9, 4),    // A–D: 9F
      ...letters(69, 4, 'Sylvania', 11, 4),   // E–H: 11F
    ],
  },
  {
    name: 'Trillium',
    kind: 'apartment',
    buildings: [
      ...letters(65, 7, 'Trillium', 9, 4),    // A–G: 9F
      ...letters(72, 7, 'Trillium', 11, 4),   // H–N: 11F
    ],
  },
  {
    name: 'Zinnia Apartments',
    kind: 'apartment',
    buildings: letters(65, 13, 'Zinnia', 5, 6),  // A–M: 5F (1 BHK)
  },
  {
    name: 'Annexe',
    kind: 'apartment',
    buildings: [
      bld('Annexe A', 11, 4),
      bld('Annexe A1', 11, 5),
      bld('Annexe B', 11, 4),
      bld('Annexe C', 11, 5),
      bld('Annexe D', 11, 5),
      bld('Annexe E', 11, 5),
      bld('Annexe F', 11, 5),
      bld('Annexe G', 11, 5),
    ],
  },
  // ── villa clusters ─────────────────────────────────────────────────────
  {
    name: 'Erica Row Houses',
    kind: 'villa',
    buildings: plots(20, 'Erica Plot'),
  },
  {
    name: 'Acacia Gardens',
    kind: 'villa',
    buildings: plots(15, 'Acacia Plot'),
  },
  {
    name: 'Mulberry Gardens',
    kind: 'villa',
    buildings: plots(15, 'Mulberry Plot'),
  },
  {
    name: 'Zinnia Row Houses',
    kind: 'villa',
    buildings: plots(15, 'Zinnia Plot'),
  },
];

export const magarpatta: SiteConfig = {
  slug: 'magarpatta',
  siteName: 'Magarpatta City',
  platformName: 'Magarpatta Go',
  wordmarkRoot: 'Magarpatta',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411028',
  tagline: 'Daily delights, sourced only from within Magarpatta City and delivered in under twenty-five minutes.',
  // Approximate boundary, lifted from app/api/geofence/check/route.ts. Replace
  // with a hand-digitized polygon once we have the MTDCC master plan.
  geofencePolygon: [
    [73.9245, 18.5180],
    [73.9340, 18.5195],
    [73.9390, 18.5160],
    [73.9395, 18.5095],
    [73.9340, 18.5045],
    [73.9260, 18.5055],
    [73.9225, 18.5110],
  ],
  societies: SOCIETIES,
  defaultHub: 'Magarpatta',
  hubSuggestions: ['Seasons Mall', 'Destination Centre', 'Magarpatta Market'],
  demoCuratorPhone: '7000000001',
  demoHelpdeskPhone: '7000000003',
};
