import { getSiteConfig } from './sites';

/**
 * Active site config for this instance — picked at module init based on
 * the SITE_SLUG env var.
 *
 * Both NEXT_PUBLIC_SITE_SLUG and SITE_SLUG are checked. Next.js inlines
 * NEXT_PUBLIC_-prefixed vars into the client bundle at build time, so
 * client components can also `import { siteConfig }` and get the right
 * site without needing to thread it through props from server parents.
 * Server-only routes can use either variable; both resolve to the same
 * value because they're both set on the Vercel project.
 *
 * Defaults to 'magarpatta' so the existing production deployment keeps
 * working without a config change. Throws fast if SITE_SLUG is set to
 * something we don't recognise — better than serving a half-configured app.
 */
const slug = (
  process.env.NEXT_PUBLIC_SITE_SLUG ||
  process.env.SITE_SLUG ||
  'magarpatta'
).trim();
export const siteConfig = getSiteConfig(slug);
