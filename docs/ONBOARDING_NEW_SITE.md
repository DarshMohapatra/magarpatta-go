# Onboarding a New Site

This codebase is **multi-instance**: one repo, many deployments. Each
deployment runs against its own database and serves a single locality.
Adding a new site (Magarpatta, Amanora, Kalyani Nagar, …) is a deploy-time
configuration change, not a schema change.

## Architecture in one paragraph

A `SITE_SLUG` (or `NEXT_PUBLIC_SITE_SLUG`) env var picks which `SiteConfig`
this build is for. The config lives in `lib/sites/<slug>.ts` and exposes
the locality directory, geofence polygon, brand strings, default hub and
demo seed data. `lib/site-config.ts` reads the env var at module init and
exports a singleton `siteConfig`. Every place that previously hardcoded
"Magarpatta" reads from this singleton.

`lib/societies.ts` is now a thin facade — its old exports
(`MAGARPATTA_SOCIETIES`, `getBuilding`, `validateFlat`, etc.) still work
unchanged but internally delegate to the active site's directory. So all
existing call sites keep working without rewrites.

If `SITE_SLUG` is unset, the app defaults to `magarpatta`. Throws fast at
boot if it's set to a slug that isn't registered.

## Steps to onboard a new site

### 1. Add a config file under `lib/sites/`

Create `lib/sites/<slug>.ts` exporting a `SiteConfig`. Use
`lib/sites/amanora.ts` or `lib/sites/magarpatta.ts` as templates. You'll
need:

- **`slug`** — URL-safe, matches the `SITE_SLUG` env var (e.g. `'kalyani'`)
- **`siteName`** — locality name shown to customers (e.g. `'Kalyani Nagar'`)
- **`platformName`** — brand on this instance (e.g. `'Kalyani Go'`)
- **`wordmarkRoot`** — first word of the brand for the wordmark (`'Kalyani'`)
- **`city`**, **`state`**, **`pincode`**
- **`tagline`** — one-line description for metadata + landing
- **`geofencePolygon`** — `Array<[lng, lat]>` vertices of the delivery
  boundary. Approximate is fine for staging; refine before customer launch
  with surveyed coordinates from the township developer.
- **`societies`** — directory of clusters/societies + their buildings.
  Each `SiteSociety` has `name`, optional `kind: 'apartment' | 'villa'`,
  optional `verified: true`, and `buildings: SiteBuilding[]`. Each
  building is `{ name, floors, flatsPerFloor }`. For 1-floor villa plots
  use `floors: 1, flatsPerFloor: 1`.
- **`defaultHub`** — string used as the placeholder default in vendor
  signup (e.g. `'Kalyani'`)
- **`hubSuggestions`** — array of common hub names within this site shown
  as the placeholder in the vendor signup form
- **`demoCuratorPhone`** — 10-digit phone seeded as the demo curator on
  first sign-in. Use a unique number per site so different staging
  instances don't collide.

### 2. Register the site in `lib/sites/index.ts`

Add the import and the registry entry:

```ts
import { kalyani } from './kalyani';

const REGISTRY: Record<string, SiteConfig> = {
  [magarpatta.slug]: magarpatta,
  [amanora.slug]: amanora,
  [kalyani.slug]: kalyani,   // ← new
};
```

### 3. Provision the database

Create a fresh Neon database (free-tier is fine for staging). Copy the
connection string. Don't reuse the Magarpatta DB — sites must not share
data.

### 4. Create the Vercel project

Either clone the existing project in the Vercel dashboard or import the
repo as a new project. Settings:

- **Root directory:** `apps/web`
- **Build script:** unchanged (the existing
  `prisma generate && prisma db push --accept-data-loss --skip-generate && next build`
  bootstraps the schema against whichever `DATABASE_URL` is set)
- **Environment variables** (set on the new project, all environments):
  - `SITE_SLUG=<slug>`
  - `NEXT_PUBLIC_SITE_SLUG=<slug>` (same value — the `NEXT_PUBLIC_` copy
    is what gets inlined into the client bundle)
  - `DATABASE_URL=<the new neon connection string>`
  - `OTP_DEMO_MODE=true` for staging (forces every OTP to `123456`); flip
    to `false` and set Fast2SMS creds before launch

### 5. First deploy

Push to the branch the new Vercel project tracks. The build will run
`prisma db push` against the new database, creating the schema.

### 6. Seed demo data

Run the demo seeder against the new database:

```bash
cd apps/web
DATABASE_URL=<new neon url> pnpm prisma db seed
```

This creates demo admin / vendor / rider accounts. The curator is
auto-provisioned on first sign-in via `siteConfig.demoCuratorPhone`.

### 7. Custom domain

Add the domain in Vercel project settings. Make sure DNS is set up.

### 8. Smoke tests

Sign in with each role and confirm the site name shows everywhere:

- Customer: `/signup` with a society from the new directory; checkout
  flow; place a prepaid order; landing page reads correctly.
- Vendor: `/vendor/signin` with the seeded vendor phone; menu / orders
  pages load.
- Rider: `/rider/signin` with the seeded rider phone; dashboard loads.
- Curator: `/curator/signin` with `siteConfig.demoCuratorPhone`; the
  account auto-provisions and the seeded name reads
  `<siteName> Curator`.
- Admin: `/admin/signin`; the wordmark and dashboard h1 read with the
  new site's branding.

## What is NOT site-aware (yet)

These remain hardcoded for now and would need a per-site override before
Amanora goes live with real customer traffic. None block staging.

- **Marketing demo content** in `components/live-orders.tsx`,
  `components/landing-pulse.tsx`, `components/partners.tsx` — uses
  Magarpatta-specific society names ("Cosmos", "Jasminium") and vendor
  names ("Magarpatta Pharmacy", "Kalika Sweets"). For other sites these
  arrays should be replaced (either swap to generic copy or move into
  `siteConfig` as an optional field).
- **Vendor seed data** in `prisma/seed-dashboards.ts` — creates Magarpatta
  vendors. New sites need their own seed file or a parameterized seeder.

## Cross-instance super-admin (future, out of scope)

When you want one pane of glass across every instance, build a separate
small dashboard app (own deployment, own DB) that polls a read-only
`/api/site-info` endpoint exposed by each instance. Each instance would
publish aggregate metrics (vendor count, orders today, GMV) to that
endpoint behind a shared secret. Don't try to retrofit cross-instance
queries — keeping each instance isolated is the whole point.
