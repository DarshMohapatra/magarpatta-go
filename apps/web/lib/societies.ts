/**
 * Magarpatta City — society → building hierarchy.
 *
 * Building counts below are approximations drawn from public listings
 * (99acres, NoBroker, MTDCC community notices). Before public launch,
 * these MUST be replaced with MTDCC's authoritative building register
 * (some societies have lettered wings like A1/A2, others use numbered
 * buildings, Heliconia has two phases, etc.).
 */

export interface Society {
  name: string;
  buildings: string[];
}

const range = (n: number, prefix: string) =>
  Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}`);

const letters = (n: number, prefix: string) =>
  Array.from({ length: n }, (_, i) => `${prefix} ${String.fromCharCode(65 + i)}`);

export const MAGARPATTA_SOCIETIES: Society[] = [
  { name: 'Annexe', buildings: letters(4, 'Annexe') },
  { name: 'Aspen', buildings: range(6, 'Aspen') },
  { name: 'Cosmos', buildings: range(24, 'Cosmos') },
  { name: 'Daffodils', buildings: range(8, 'Daffodils') },
  { name: 'Erica', buildings: range(5, 'Erica') },
  { name: 'Grevillea', buildings: range(3, 'Grevillea') },
  { name: 'Heliconia I', buildings: letters(6, 'Heliconia I') },
  { name: 'Heliconia II', buildings: range(18, 'Heliconia II') },
  { name: 'Iris', buildings: range(20, 'Iris') },
  { name: 'Jasminium', buildings: range(8, 'Jasminium') },
  { name: 'Laburnum Park', buildings: range(10, 'Laburnum Park') },
  { name: 'Nyati Evolve', buildings: range(3, 'Evolve') },
  { name: 'Roystonea', buildings: range(4, 'Roystonea') },
  { name: 'Sylvania', buildings: range(8, 'Sylvania') },
  { name: 'Trillium', buildings: letters(4, 'Trillium') },
  { name: 'Zinnia', buildings: range(6, 'Zinnia') },
];

export const SOCIETY_NAMES = MAGARPATTA_SOCIETIES.map((s) => s.name);

export const SOCIETY_COUNT = MAGARPATTA_SOCIETIES.length;
export const TOTAL_BUILDINGS = MAGARPATTA_SOCIETIES.reduce(
  (sum, s) => sum + s.buildings.length,
  0,
);

export function getBuildings(societyName: string): string[] {
  return MAGARPATTA_SOCIETIES.find((s) => s.name === societyName)?.buildings ?? [];
}
