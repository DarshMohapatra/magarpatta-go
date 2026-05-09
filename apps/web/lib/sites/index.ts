import type { SiteConfig } from './types';
import { magarpatta } from './magarpatta';
import { amanora } from './amanora';

const REGISTRY: Record<string, SiteConfig> = {
  [magarpatta.slug]: magarpatta,
  [amanora.slug]: amanora,
};

/** All site configs registered in this build. Used by tooling, not at runtime. */
export const ALL_SITES: SiteConfig[] = Object.values(REGISTRY);

export function getSiteConfig(slug: string): SiteConfig {
  const found = REGISTRY[slug];
  if (!found) {
    const known = Object.keys(REGISTRY).join(', ');
    throw new Error(
      `Unknown SITE_SLUG "${slug}". Add a config under lib/sites/ and register it in lib/sites/index.ts. Known sites: ${known}`,
    );
  }
  return found;
}

export type { SiteConfig, SiteSociety, SiteBuilding } from './types';
