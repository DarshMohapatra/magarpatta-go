/**
 * Site directory facade.
 *
 * Historically this file held the entire Magarpatta directory inline. With
 * the multi-instance refactor the data lives under `lib/sites/<slug>.ts` and
 * the active site is picked at module init by `lib/site-config.ts`. The
 * exports below are kept stable so dozens of call sites don't need to be
 * rewritten — they just transparently look at whichever site this build is
 * configured for.
 *
 * The `MAGARPATTA_*` names are now misnomers; they refer to whichever site
 * is active. A follow-up rename (drop the prefix) is straightforward but
 * unnecessary for the multi-instance work.
 */

import { siteConfig } from './site-config';
import type { SiteSociety, SiteBuilding } from './sites/types';

// Re-export the shared types under their old names for backwards compat.
export type Building = SiteBuilding;
export type Society = SiteSociety;

// ── data exports ────────────────────────────────────────────────────────

export const MAGARPATTA_SOCIETIES: Society[] = siteConfig.societies;

export const SOCIETY_NAMES = siteConfig.societies.map((s) => s.name);

export const SOCIETY_COUNT = siteConfig.societies.length;
export const APARTMENT_SOCIETY_COUNT = siteConfig.societies.filter((s) => s.kind !== 'villa').length;
export const VILLA_SOCIETY_COUNT = siteConfig.societies.filter((s) => s.kind === 'villa').length;
export const TOTAL_BUILDINGS = siteConfig.societies.reduce((s, c) => s + c.buildings.length, 0);

// ── lookups ─────────────────────────────────────────────────────────────

export function getSociety(name: string): Society | undefined {
  return siteConfig.societies.find((s) => s.name === name);
}

export function getBuildings(societyName: string): Building[] {
  return getSociety(societyName)?.buildings ?? [];
}

export function getBuilding(societyName: string, buildingName: string): Building | undefined {
  return getBuildings(societyName).find((b) => b.name === buildingName);
}

/**
 * An address is "verified" when its society + building exist in the active
 * site's directory. Free-text office-tower entries fail this check by
 * design — admin can promote them by adding the entry to the site config.
 */
export function isVerifiedAddress(society: string, building: string): boolean {
  return Boolean(getBuilding(society, building));
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
