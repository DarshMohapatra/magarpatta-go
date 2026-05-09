/**
 * Each instance of this app is configured for one locality (one "site"). The
 * shape below describes everything site-specific — directory data, geofence,
 * brand strings, demo seed phones — so that swapping in a new site is just
 * dropping in a new SiteConfig and pointing SITE_SLUG at it.
 */

export interface SiteBuilding {
  name: string;
  floors: number;
  flatsPerFloor: number;
}

export interface SiteSociety {
  name: string;
  buildings: SiteBuilding[];
  /** Resident-confirmed against the building directory. */
  verified?: boolean;
  kind?: 'apartment' | 'villa';
}

export interface SiteConfig {
  /** URL-safe identifier; matches the SITE_SLUG env var. */
  slug: string;

  /** The locality name shown to customers, e.g. 'Magarpatta City'. */
  siteName: string;

  /** The brand on this instance, e.g. 'Magarpatta Go' or 'Amanora Go'. */
  platformName: string;

  /**
   * The first word of the brand, rendered before the italic "Go" in the
   * wordmark (e.g. 'Magarpatta' for 'Magarpatta Go'). Kept as a separate
   * field so each site can pick its own brand syntax without parsing
   * platformName at runtime.
   */
  wordmarkRoot: string;

  /** Postal city — currently 'Pune' for both, but per-site for future expansion. */
  city: string;
  state: string;
  pincode: string;

  /** Tagline used in metadata and the marketing hero. */
  tagline: string;

  /** Lat/lng vertices of the delivery boundary. Used by /api/geofence/check. */
  geofencePolygon: Array<[number, number]>;

  /** Master list of clusters/societies + their buildings for address validation. */
  societies: SiteSociety[];

  /** Free-text default for the vendor signup form's hub field. */
  defaultHub: string;

  /** Hub name examples shown in the vendor signup form's placeholder. */
  hubSuggestions: string[];

  /** Demo curator phone seeded on first /api/curator/session POST. */
  demoCuratorPhone: string;

  /** Demo helpdesk phone seeded on first /api/helpdesk/session POST. */
  demoHelpdeskPhone: string;
}
