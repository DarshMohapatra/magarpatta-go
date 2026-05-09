import type { SiteConfig, SiteBuilding, SiteSociety } from './types';

// ── helpers ─────────────────────────────────────────────────────────────

function bld(name: string, floors: number, flatsPerFloor: number): SiteBuilding {
  return { name, floors, flatsPerFloor };
}

// Amanora's tower-numbering doesn't follow letter sequences like Magarpatta,
// so we list towers explicitly. Flats-per-floor inferred from BHK typology
// (2-3 BHK → 4/floor, 1 BHK → 6/floor) — refine when MTDCC-equivalent
// directory is available from The City Corporation Ltd.
function towers(prefix: string, names: string[], floors: number, fpf: number): SiteBuilding[] {
  return names.map((n) => bld(`${prefix} ${n}`, floors, fpf));
}

// ── Amanora Park Town clusters ──────────────────────────────────────────
// Source: Amanora_Park_Town_Building_Directory.pdf · Google Maps Places API
// + resident reviews · The City Corporation Ltd. (April 2026).

const SOCIETIES: SiteSociety[] = [
  {
    name: 'Gateway Towers',
    kind: 'apartment',
    verified: true, // T-98, T-99, T-100 all directly Maps-confirmed
    buildings: [
      bld('Tower T-98', 45, 3),
      bld('Tower T-99', 45, 3),
      bld('Tower T-100', 45, 3),
    ],
  },
  {
    name: 'Aspire Towers',
    kind: 'apartment',
    buildings: [
      bld('Tower 1', 22, 4),
      bld('Tower 2', 22, 4),
      bld('Tower 3', 22, 4),
      bld('Tower 4', 22, 4),
      bld('Tower 5', 22, 4),
      bld('Tower 6', 22, 4),
      bld('Tower 7', 22, 4),
      bld('Tower 8', 22, 4),
      bld('Tower 9', 22, 4),
      bld('Tower 10', 22, 4),
      bld('Tower 11A', 22, 4),
      bld('Tower 11B', 22, 4),
      bld('Tower 12A', 22, 4),
      bld('Tower 12B', 22, 4),
    ],
  },
  {
    name: 'Future Towers',
    kind: 'apartment',
    buildings: towers('Tower', ['51', '52', '53', '54', '55', '56', '57', '58'], 28, 4),
  },
  {
    name: 'Sterling Towers',
    kind: 'apartment',
    buildings: towers('Tower', ['13', '14', '15', '16', '17', '18'], 20, 4),
  },
  {
    name: 'Trendy Towers',
    kind: 'apartment',
    buildings: towers('Tower', ['T-28', 'T-29', 'T-30', 'T-31', 'T-32', 'T-33'], 20, 4),
  },
  {
    name: 'Adreno Towers',
    kind: 'apartment',
    buildings: towers('Tower', ['1', '2', '3', '4', '5'], 32, 4),
  },
  {
    name: 'Gold Towers',
    kind: 'apartment',
    buildings: towers('Tower', ['T-44', 'T-45', 'T-46', 'T-47', 'T-48'], 30, 4),
  },
  {
    name: 'Neo Towers',
    kind: 'apartment',
    buildings: towers('Tower', ['1', '2', '3'], 28, 4),
  },
  {
    name: 'Crown Towers',
    kind: 'apartment',
    buildings: towers('Tower', ['1', '2', '3', '4'], 25, 4),
  },
  {
    name: 'Arbano Towers',
    kind: 'apartment',
    buildings: towers('Tower', ['1', '2', '3'], 24, 4),
  },
  // Low-rise: ground + 3 floors, no lift, ~6 flats/floor (1-2 BHK).
  {
    name: 'Gardenia Society',
    kind: 'apartment',
    buildings: [
      bld('Block A', 3, 6),
      bld('Block B', 3, 6),
      bld('Block C', 3, 6),
    ],
  },
];

export const amanora: SiteConfig = {
  slug: 'amanora',
  siteName: 'Amanora Park Town',
  // Placeholder — real brand decision is downstream. Each instance owns its
  // platformName so we can pivot per-deployment without touching shared code.
  platformName: 'Amanora Go',
  wordmarkRoot: 'Amanora',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411028', // Hadapsar — same pin as Magarpatta but a different township
  tagline: 'Daily delights, sourced only from within Amanora Park Town and delivered in under twenty-five minutes.',
  // Approximate boundary around Amanora Park Town, Hadapsar, Pune. The real
  // township spans 400+ acres; refine before customer launch with surveyed
  // coordinates from The City Corporation Ltd.
  geofencePolygon: [
    [73.9290, 18.5170],
    [73.9395, 18.5180],
    [73.9445, 18.5135],
    [73.9450, 18.5060],
    [73.9395, 18.5025],
    [73.9305, 18.5040],
    [73.9275, 18.5095],
  ],
  societies: SOCIETIES,
  defaultHub: 'Amanora',
  hubSuggestions: ['Amanora Mall', 'Amanora Town Centre', 'Amanora Main Road'],
  // Different demo phone so the two staging instances don't collide if a
  // tester ever signs into both with the same number.
  demoCuratorPhone: '7000000002',
  demoHelpdeskPhone: '7000000004',
};
