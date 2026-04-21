/**
 * Magarpatta City — society → building hierarchy.
 *
 * Data source: Magarpatta City Building Directory (April 2026) — Google Maps
 * Places API + resident verification (Jasminium) + MTDCC records.
 *
 * 12 apartment clusters (194 buildings) + 4 villa clusters.
 *
 * Floor counts are per the directory; flats-per-floor is inferred from BHK
 * typology (1 BHK → 6/floor, 2-3 BHK → 4/floor, 3-4 BHK → 3/floor, villas → 1).
 *
 * Jasminium A-V was corrected from 11F to 9F per the directory.
 */

export interface Building {
  name: string;
  floors: number;
  flatsPerFloor: number;
}

export interface Society {
  name: string;
  buildings: Building[];
  verified?: boolean;
  kind?: 'apartment' | 'villa';
}

// ── helpers ─────────────────────────────────────────────────────────────

function bld(name: string, floors: number, flatsPerFloor: number): Building {
  return { name, floors, flatsPerFloor };
}

function letters(start: number, count: number, prefix: string, floors: number, fpf: number, suffix = ''): Building[] {
  return Array.from({ length: count }, (_, i) =>
    bld(`${prefix} ${String.fromCharCode(start + i)}${suffix}`, floors, fpf),
  );
}

function plots(count: number, prefix: string): Building[] {
  return Array.from({ length: count }, (_, i) => bld(`${prefix} ${i + 1}`, 2, 1));
}

// ── apartment clusters (from building directory) ────────────────────────

export const MAGARPATTA_SOCIETIES: Society[] = [
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

  // ── villa clusters ────────────────────────────────────────────────────
  // Plot counts are approximate — replace with MTDCC register when available.
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

export const SOCIETY_NAMES = MAGARPATTA_SOCIETIES.map((s) => s.name);

export const SOCIETY_COUNT = MAGARPATTA_SOCIETIES.length;
export const APARTMENT_SOCIETY_COUNT = MAGARPATTA_SOCIETIES.filter((s) => s.kind !== 'villa').length;
export const VILLA_SOCIETY_COUNT = MAGARPATTA_SOCIETIES.filter((s) => s.kind === 'villa').length;
export const TOTAL_BUILDINGS = MAGARPATTA_SOCIETIES.reduce((s, c) => s + c.buildings.length, 0);

export function getSociety(name: string): Society | undefined {
  return MAGARPATTA_SOCIETIES.find((s) => s.name === name);
}

export function getBuildings(societyName: string): Building[] {
  return getSociety(societyName)?.buildings ?? [];
}

export function getBuilding(societyName: string, buildingName: string): Building | undefined {
  return getBuildings(societyName).find((b) => b.name === buildingName);
}

// ── flat number parsing & validation ────────────────────────────────────

export interface ParsedFlat {
  floor: number;
  unit: number;
}

export function parseFlat(flat: string): ParsedFlat | null {
  const clean = flat.trim().replace(/\D/g, '');
  if (clean.length < 3 || clean.length > 4) return null;
  const n = parseInt(clean, 10);
  if (isNaN(n)) return null;
  return { floor: Math.floor(n / 100), unit: n % 100 };
}

export type FlatValidation =
  | { ok: true; floor: number; unit: number }
  | { ok: false; reason: string; hint?: string };

export function validateFlat(flat: string, building: Building): FlatValidation {
  if (!flat.trim()) return { ok: false, reason: 'Flat number required' };

  // Villas: plots have single-floor / single-unit semantics. Accept '101' as canonical.
  if (building.floors === 1 && building.flatsPerFloor === 1) {
    const clean = flat.trim().replace(/\D/g, '');
    if (clean === '101' || clean === '1' || clean === '0') {
      return { ok: true, floor: 1, unit: 1 };
    }
    return { ok: false, reason: 'Villas use plot number only', hint: 'enter 101' };
  }

  const parsed = parseFlat(flat);
  if (!parsed) return { ok: false, reason: 'Use 3 or 4 digits', hint: 'e.g., 302 or 1104' };
  if (parsed.floor < 1) return { ok: false, reason: 'Floor must be 1 or higher' };

  if (parsed.floor > building.floors) {
    return {
      ok: false,
      reason: `${building.name} has ${building.floors} floors`,
      hint: `Max floor is ${building.floors}`,
    };
  }

  if (parsed.unit < 1 || parsed.unit > building.flatsPerFloor) {
    const maxUnit = String(building.flatsPerFloor).padStart(2, '0');
    return {
      ok: false,
      reason: `${building.name} has ${building.flatsPerFloor} flats per floor`,
      hint: `Unit must be 01–${maxUnit}`,
    };
  }

  return { ok: true, floor: parsed.floor, unit: parsed.unit };
}

export function generateFlats(building: Building): string[] {
  const out: string[] = [];
  for (let f = 1; f <= building.floors; f++) {
    for (let u = 1; u <= building.flatsPerFloor; u++) {
      out.push(`${f}${String(u).padStart(2, '0')}`);
    }
  }
  return out;
}
