/**
 * Magarpatta City — society → building hierarchy with full address metadata.
 *
 * Data notes:
 *  - Jasminium data comes from a verified resident (user lives here).
 *    Confirmed: buildings A–V + A1–I1, 4 flats/floor.
 *  - All other societies are approximations drawn from public listings
 *    (99acres, NoBroker, MTDCC community notices). Building counts and
 *    floor heights MUST be replaced with MTDCC's authoritative register
 *    before public launch.
 *  - Flat numbering convention assumed: <floor><unit>, where unit is
 *    zero-padded 2 digits. Example: 302 = 3rd floor, unit 02. Floor 10+
 *    produces 4-digit flats (1002 = 10th floor, unit 02).
 */

export interface Building {
  name: string;
  floors: number;        // Number of residential floors (first floor = 1)
  flatsPerFloor: number; // Typical Magarpatta: 4 per floor
}

export interface Society {
  name: string;
  buildings: Building[];
  verified?: boolean; // true if data comes from a confirmed source
}

// ── helpers ──────────────────────────────────────────────────────────────

function letterBuildings(
  count: number,
  prefix: string,
  floors: number,
  flatsPerFloor: number,
  suffix = '',
): Building[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `${prefix} ${String.fromCharCode(65 + i)}${suffix}`,
    floors,
    flatsPerFloor,
  }));
}

function numberBuildings(
  count: number,
  prefix: string,
  floors: number,
  flatsPerFloor: number,
): Building[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `${prefix} ${i + 1}`,
    floors,
    flatsPerFloor,
  }));
}

// ── societies ─────────────────────────────────────────────────────────────

export const MAGARPATTA_SOCIETIES: Society[] = [
  {
    name: 'Annexe',
    buildings: letterBuildings(4, 'Annexe', 8, 4),
  },
  {
    name: 'Aspen',
    buildings: numberBuildings(6, 'Aspen', 11, 4),
  },
  {
    name: 'Cosmos',
    buildings: numberBuildings(24, 'Cosmos', 11, 4),
  },
  {
    name: 'Daffodils',
    buildings: [
      ...numberBuildings(4, 'Daffodils', 6, 4),
      ...Array.from({ length: 4 }, (_, i) => ({
        name: `Daffodils ${i + 5}`,
        floors: 11,
        flatsPerFloor: 4,
      })),
    ],
  },
  {
    name: 'Erica',
    buildings: numberBuildings(5, 'Erica', 9, 4),
  },
  {
    name: 'Grevillea',
    buildings: numberBuildings(3, 'Grevillea', 11, 4),
  },
  {
    name: 'Heliconia I',
    buildings: letterBuildings(6, 'Heliconia I', 5, 6),
  },
  {
    name: 'Heliconia II',
    buildings: numberBuildings(18, 'Heliconia II', 6, 6),
  },
  {
    name: 'Iris',
    buildings: [
      ...numberBuildings(12, 'Iris', 9, 4),
      ...Array.from({ length: 8 }, (_, i) => ({
        name: `Iris ${i + 13}`,
        floors: 11,
        flatsPerFloor: 4,
      })),
    ],
  },
  {
    // Verified by resident: A–V (22 buildings), then A1–I1 (9 buildings)
    // 4 flats per floor across all. Floor count ~11 (typical for Magarpatta).
    name: 'Jasminium',
    verified: true,
    buildings: [
      ...letterBuildings(22, 'Jasminium', 11, 4),           // A..V
      ...letterBuildings(9, 'Jasminium', 11, 4, '1'),       // A1..I1
    ],
  },
  {
    name: 'Laburnum Park',
    buildings: numberBuildings(10, 'Laburnum Park', 11, 4),
  },
  {
    name: 'Nyati Evolve',
    buildings: numberBuildings(3, 'Evolve', 11, 4),
  },
  {
    name: 'Roystonea',
    buildings: numberBuildings(4, 'Roystonea', 11, 4),
  },
  {
    name: 'Sylvania',
    buildings: [
      ...numberBuildings(4, 'Sylvania', 9, 4),
      ...Array.from({ length: 4 }, (_, i) => ({
        name: `Sylvania ${i + 5}`,
        floors: 11,
        flatsPerFloor: 4,
      })),
    ],
  },
  {
    name: 'Trillium',
    buildings: letterBuildings(4, 'Trillium', 11, 4),
  },
  {
    name: 'Zinnia',
    buildings: numberBuildings(6, 'Zinnia', 11, 4),
  },
];

export const SOCIETY_NAMES = MAGARPATTA_SOCIETIES.map((s) => s.name);

export const SOCIETY_COUNT = MAGARPATTA_SOCIETIES.length;
export const TOTAL_BUILDINGS = MAGARPATTA_SOCIETIES.reduce(
  (sum, s) => sum + s.buildings.length,
  0,
);

export function getSociety(name: string): Society | undefined {
  return MAGARPATTA_SOCIETIES.find((s) => s.name === name);
}

export function getBuildings(societyName: string): Building[] {
  return getSociety(societyName)?.buildings ?? [];
}

export function getBuilding(societyName: string, buildingName: string): Building | undefined {
  return getBuildings(societyName).find((b) => b.name === buildingName);
}

// ── flat number parsing & validation ─────────────────────────────────────

export interface ParsedFlat {
  floor: number;
  unit: number;
}

/** Parse a 3 or 4-digit flat number into floor + unit. */
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

/** Validate a flat against a building's floor & flats-per-floor rules. */
export function validateFlat(flat: string, building: Building): FlatValidation {
  if (!flat.trim()) {
    return { ok: false, reason: 'Flat number required' };
  }

  const parsed = parseFlat(flat);
  if (!parsed) {
    return {
      ok: false,
      reason: 'Use 3 or 4 digits',
      hint: `e.g., 302 or 1104`,
    };
  }

  if (parsed.floor < 1) {
    return {
      ok: false,
      reason: `Floor must be 1 or higher`,
    };
  }

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

/** Generate every valid flat number for a building (for dropdown UX). */
export function generateFlats(building: Building): string[] {
  const out: string[] = [];
  for (let f = 1; f <= building.floors; f++) {
    for (let u = 1; u <= building.flatsPerFloor; u++) {
      out.push(`${f}${String(u).padStart(2, '0')}`);
    }
  }
  return out;
}
