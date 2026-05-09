# Magarpatta Go — Feature Documentation

> **Last sync:** 2026-04-29. This file is the human-readable map of what the app actually does today. When in doubt, the code under `apps/web/` is the source of truth — tables here cite the file paths so you can verify.

---

## 1. What the platform is

A hyper-local delivery service for **gated townships in Pune**. It moves food, groceries, medicines, fresh meat, bakery, and daily essentials between vendors and customers — all inside one township's geofence. The differentiator is depth: every vendor lives inside the gates, every customer too, every rider stays inside the gates. No bridge crossings, no inter-area runs.

The codebase ships as a **multi-instance** platform: one repo, many separate deployments. Each township gets its own Vercel project, its own Neon database, its own admin team, its own customers — selected at build time by the `SITE_SLUG` env var. Two are live today:

| Instance | URL | `SITE_SLUG` | Locality |
| --- | --- | --- | --- |
| Magarpatta City | https://web-eta-ebon-80.vercel.app | `magarpatta` (default) | 16 societies, 259 buildings |
| Amanora Park Town | https://amanora-go.vercel.app | `amanora` | 11 clusters, 60 towers |

Site-specific data (the society directory, geofence polygon, brand strings, demo seed phones) lives under `lib/sites/<slug>.ts`. Adding a new site is a config change, not a schema change — see `docs/ONBOARDING_NEW_SITE.md` for the runbook. Cross-instance "super admin" view is intentionally *not* built; each instance is data-isolated by design.

**Stack at a glance**

| Layer | Choice | Notes |
| --- | --- | --- |
| Frontend + backend | Next.js 15 App Router (TypeScript, Tailwind, shadcn-style components) | Single repo, single deploy. API routes under `app/api/**/route.ts`. |
| DB | Postgres on Neon (free tier) | Prisma 6 client. Schema at `apps/web/prisma/schema.prisma`. |
| Hosting | Vercel | Build script auto-runs `prisma db push` (demo phase only — replace with `migrate deploy` before launch). |
| Auth | Server-owned phone OTP via Fast2SMS | Unified across all roles. `lib/otp.ts`. |
| Maps | Mappls (MapmyIndia) | Geofence polygon + ETA. |
| Payments | Razorpay (UPI / card / netbanking) + COD | Customer-facing checkout. |
| OCR | tesseract.js (in-browser wasm) | Used for menu import; curator catches mistakes. |
| QR scanning | html5-qrcode (in-browser) | Camera scan for menu URLs / payloads. |

Repo layout:

```
apps/web/                   ← the Next.js app (the only deployable today)
  app/                      ← all routes (UI + API)
  components/               ← shared React components per role
  lib/                      ← server-only helpers (otp, sessions, pricing, parsing)
  prisma/                   ← schema + seed scripts
docs/                       ← markdown like this file
wireframes/                 ← SVG mobile-app wireframes (16 screens)
```

---

## 2. Roles

Five distinct portals — each with its own session cookie and its own scope of permissions.

| Role | Portal entry | Cookie | Sign in flow | What they can do |
| --- | --- | --- | --- | --- |
| **Customer** | `/signin`, `/signup` | `mg_session` | Phone → OTP → name + address (society / building / flat) | Browse vendors, place orders, track deliveries, view history. Outside the geofence is politely declined. |
| **Vendor** | `/vendor/signin`, `/vendor/register` | `mg_vendor_session` | Phone → OTP. Pending vendors blocked until admin approves. | Manage menu, accept/reject orders, run campaigns, request payouts, bulk-import a menu (photo / QR / paste). |
| **Rider** | `/rider/signin`, `/rider/register` | `mg_rider_session` | Phone → OTP. Pending riders blocked until admin verifies DL + Aadhaar. | Toggle on/off-duty, accept available orders, mark pickup → delivered, view daily earnings + payout schedule. |
| **Curator** | `/curator/signin` | `mg_curator_session` | Phone → OTP. Whitelist-only. | Review every bulk menu-import job — verify each item against the original photo, fix what OCR missed, forward to admin. |
| **Admin** | `/admin/signin` | `mg_admin_session` | Phone → OTP. Hard-listed `Admin` rows. | Approve/reject vendors, riders, campaigns, menu PendingChanges. View activity feed, finance, customer list, live orders. |

Every role's session library lives at `apps/web/lib/{role}-session.ts` and is read via the React `cache()` so a single request makes one DB lookup.

---

## 3. Customer features

### 3.1 Onboarding (`/signup` — 3 steps)
1. Name + phone (10-digit Indian mobile)
2. OTP verify → upserts the `User` row → sets `mg_session` cookie (signin = signup; same code path as `/signin`)
3. Address picker: society dropdown → building → flat (validated against `lib/societies.ts`, which encodes every building's floors + flats-per-floor)

Outside-the-geofence flats are rejected at this step.

### 3.2 Browsing
- **`/home`** — landing with hero, partners, "How it works", waitlist, Categories, Fresh Drops, live orders ticker.
- **`/menu`** — full catalogue, grouped by category, with search.
- **`/restaurants`** + **`/restaurants/[slug]`** — vendor list and detail with their menu.
- **Live campaign banners** at the top of `/menu` — auto-rotating, dismissible per session, urgent-toast for FLASH_SALE / LATE_NIGHT.
- **Active discounts** are pre-applied on every product card. Original MRP shows struck-through; sale badge reads "20% off" or "₹50 off" depending on campaign type.

### 3.3 Cart
- Stored in Zustand (`lib/cart.ts`) with localStorage persistence.
- **Hub-locked**: a cart can only contain vendors from the same hub. Trying to add across hubs raises a switch dialog ("Replace cart?").
- **MRP-only display**: items show their printed MRP. The +₹1 hyper-local fee is broken out as a separate line at checkout — never bundled into the line price.

### 3.4 Checkout (`/checkout`)
3-step flow: Cart review → address confirm → payment.

Bill breakdown rendered from `lib/pricing.ts → computeBreakdown()`:

| Line | How it's computed |
| --- | --- |
| Subtotal (MRP) | Σ `mrpInr × qty` |
| Convenience fee | Σ `(priceInr − mrpInr) × qty` for non-regulated items only (Legal Metrology rule) |
| Tax | 5% GST on subtotal |
| Add-ons | Gift wrap ₹50, insurance ₹100, tip — optional |
| Delivery | Flat ₹25, waived by `FREEDEL` coupon |
| Coupon discount | Per coupon type (PERCENT / FLAT / FREE_DELIVERY) — capped at `maxDiscountInr` |

**No coupon stacking on top of an active campaign.** If any item in the cart has a campaign discount applied, coupons are blocked at order placement (`/api/orders/route.ts`).

### 3.5 Tracking + history
- **`/orders/[id]`** — status timeline, rider card with name + vehicle + call/chat buttons.
- **`/orders`** — past orders.
- Live order updates currently come from refetching; sockets are not wired in this phase.

---

## 4. Vendor features

Lives under `/vendor/*`. Vendor must be `approvalStatus = APPROVED` to do anything beyond signin.

### 4.1 Dashboard (`/vendor`)
Pending order count, today's GMV, active orders, quick-action tiles (Menu / Import / Campaigns).

### 4.2 Menu management (`/vendor/menu`)
- List of all the vendor's products grouped by category.
- **Stock toggle is operational** — flips `inStock` instantly, no admin review.
- **Add / Edit / Remove for single items** writes a `PendingChange` row directly. Admin approves on `/admin/changes`.
- **+ Add item button** — single-item form (name, MRP, price, regulated, veg, unit, accent, glyph).
- **Import from photo / QR** — links to `/vendor/menu/import` (next section).

### 4.3 Bulk menu import (`/vendor/menu/import`)
Three input tabs that all funnel into one `MenuImportJob` for the curator:

| Tab | What happens |
| --- | --- |
| **Photo** | Vendor uploads 1-N photos of their printed menu. Browser-side: image gets binarised (Otsu adaptive threshold, auto-invert dark backgrounds), upscaled to ~1800 px, split at vertical gutters into columns, OCR'd with three Tesseract passes (PSM 6 + 4 + 11) per column, parsed by `lib/menu-parser.ts`. |
| **QR** | Camera scan via html5-qrcode. URLs → server fetch + HTML strip + parse. Raw text payloads → parse directly. |
| **Paste** | Vendor pastes menu text. Parse runs on submit. |

Vendor never sees the parsed table. They see a quiet summary card: *"N photos · M items pre-parsed"* and a category dropdown. Hitting **Send to curator** creates a `MenuImportJob` (status `PENDING_CURATOR`) with:
- Compressed JPEG bytes for each photo (max 1200 px wide, q=0.8 → ~80-250 KB each, stored as `Bytes` in `MenuImportImage`)
- The pre-parsed items list (best-effort — curator fixes anything wrong)

### 4.4 Campaigns (`/vendor/campaigns`)
Vendor can run any of 8 campaign types: `FLASH_SALE`, `BOGO`, `WEEKEND`, `FESTIVAL`, `EARLY_BIRD`, `LATE_NIGHT`, `NEW_OPENING`, `TIFFIN_SERVICE`.

**Discount kinds** (mutually exclusive):
- **% off** — `discountPct: 1-90`
- **₹ off** — `discountFlatInr: any positive integer`

**Scope** (radio + product picker):
- **Whole menu** — applies to every non-regulated product the vendor sells
- **Selected items only** — vendor checks specific products (regulated MRP items are shown but disabled — Legal Metrology forbids discounting them)

Every campaign mutation (create / edit / remove) writes BOTH the `Campaign` row AND a parallel `PendingChange` audit row. Admin can approve from either the **Campaigns** tab (rich UI) or the **Approvals** tab (per-change diff) — actions are mirrored across both queues in a single transaction.

### 4.5 Orders, payouts, feedback
- **`/vendor/orders`** — incoming → preparing → ready → out-for-delivery board, with accept/reject buttons.
- **`/vendor/payouts`** — daily transfer schedule and last-week breakdown.
- **`/vendor/shop`** — vendor profile (hours, address, fulfilment mode).

---

## 5. Rider features

Lives under `/rider/*`. Rider must be `approvalStatus = APPROVED`.

| Page | Function |
| --- | --- |
| `/rider` | On-duty toggle, today's stats (delivered count + earnings), available pickup card, recent trips |
| `/rider/orders/[id]` | Pickup directions, vendor contact, items list, mark-picked-up button → delivery navigation → mark-delivered |
| `/rider/feedback` | Rider can flag issues (vendor late, wrong item, address bad, etc.) |
| `/rider/register` | DL + Aadhaar + vehicle RC submission for admin review |

**Hyper-local guarantee**: rider trips never leave the township geofence. The map auto-restricts pickup + drop pins to the polygon defined in `lib/societies.ts`.

---

## 6. Curator features (the human-in-the-loop layer)

Lives under `/curator/*`. The curator is the bridge between OCR and admin: every bulk menu-import passes through them.

| Page | Function |
| --- | --- |
| `/curator` | Queue: every `MenuImportJob` with status `PENDING_CURATOR`. Sorted oldest-first (FIFO). |
| `/curator/[jobId]` | Split view: original photo(s) on the left (sticky on desktop), editable item table on the right. Edit name / MRP / unit / veg / MRP-locked, add missing rows, delete noise. **Approve · forward to admin** fans out one `PRODUCT/CREATE` PendingChange per item. **Reject** with a note clears the job and surfaces the reason to the vendor. |
| `/curator/history` | Last 60 reviewed jobs, filterable by status. |

The curator only sets **MRP** — `priceInr` is auto-derived server-side as `mrp + 1` for non-regulated items, `mrp` for regulated. The customer-facing convenience fee is broken out at checkout (see §3.4).

**Single-item edits do NOT go through the curator** — only bulk imports. The vendor's existing "+ Add item" / "Edit" form keeps writing PendingChange directly. This keeps quick fixes fast.

---

## 7. Admin features

Lives under `/admin/*`. Top nav order:

`Overview · Vendors · Riders · Orders · Campaigns · Approvals · Customers · Finance · Activity`

| Page | Function |
| --- | --- |
| `/admin` | Pending vendor / rider / campaign / approvals counts; today's GMV; quick-action tiles |
| `/admin/vendors` | Approve / reject pending vendors (FSSAI, drug licence checks happen offline) |
| `/admin/riders` | Approve / reject pending riders (DL + Aadhaar verification) |
| `/admin/orders` | Live orders board, reassign rider, cancel with refund note |
| `/admin/campaigns` | Per-campaign review with full diff. Approving a removal request deletes the campaign; rejecting clears the flag. Creates and edits go through the same surface. |
| `/admin/changes` | Generic PendingChange queue. Tabs: **Awaiting · Applied · Rejected**. Diff view side-by-side per change. Curator-forwarded menu items show up as `Vendor · curated import "Item Name"`. |
| `/admin/customers` | List of registered customers with addresses |
| `/admin/finance` | GMV, payout summary, coupon-redemption stats |
| `/admin/activity` | Cross-portal audit feed (next section) |

### 7.1 Activity feed (`/admin/activity`)
Every meaningful action by every role logs an `ActivityLog` row via `lib/activity-log.ts`. The page renders a single feed filterable by:
- **Role** — Vendors / Riders / Curators / Admins / Customers (chip selector with counts)
- **Actor** — free-text match against `actorName` (case-insensitive)

Currently logged actions:
- Vendor: `CAMPAIGN_CREATE`, `CAMPAIGN_EDIT`, `CAMPAIGN_REMOVE_REQUEST`, `PRODUCT_CREATE`, `MENU_IMPORT_SUBMIT`
- Curator: `MENU_IMPORT_APPROVE`, `MENU_IMPORT_REJECT`
- Admin: `PENDING_CHANGE_APPROVE`, `PENDING_CHANGE_REJECT`

The helper is fire-and-forget (errors swallowed and console-logged) so a logging blip never breaks a user action. Adding new action types is a one-line `await logActivity({...})` call inside the relevant route.

---

## 8. Auth — one unified system

`apps/web/lib/otp.ts` handles every signin/signup. The flow:

```
client → POST /api/auth/otp/send  { phone, purpose }
       ←     { ok, demoOtp?, smsSent }
client → POST /api/{role}/session   { phone, code }
       ←     200 + sets {role}_session cookie
```

| Aspect | Value |
| --- | --- |
| Code length | 6 digits |
| Expiry | 5 minutes |
| Resend cooldown | 30 s per (phone, purpose) |
| Max wrong attempts | 5 → invalidates code |
| Storage | sha256 hash, never plaintext |
| SMS provider | Fast2SMS (`route=otp`) |
| Demo override | `const DEMO_MODE = true` at the top of `lib/otp.ts` — every phone accepts `123456` without sending SMS |

**Demo phones with permanent `123456` access** (kept even when `DEMO_MODE` is flipped off):
- Vendors: `9000000001`-`9000000007`
- Riders: `8888888801`-`8888888805`
- Admin: `9999999999`
- Curator: `7000000001`

Firebase phone auth is **no longer used anywhere**. `lib/firebase-phone.ts` and `/api/auth/firebase-session` are dead code — safe to delete before launch.

---

## 9. Pricing model

Three rules govern every price the customer sees.

### 9.1 MRP everywhere
Every product card, every cart line, every banner shows **the printed MRP**. Vendors enter MRP. The platform never displays a marked-up price as the headline.

### 9.2 Convenience fee = ₹1 per non-regulated unit
- A `Product` with `isRegulated = false` (prepared food, sweets, fresh produce, fresh meat, bakery) carries a hidden ₹1 markup. Stored as `priceInr = mrpInr + 1`.
- At checkout, the breakdown shows it as a separate **Convenience fee ₹N** line — never bundled into the MRP.
- A `Product` with `isRegulated = true` (packaged FMCG, medicines, packaged staples) charges exactly MRP — no markup. Legal Metrology Rules, 2011 forbid selling above printed MRP for these categories.

### 9.3 Campaign discounts
When an active campaign matches a product:
- The MRP shown on the card collapses to the discounted price (struck-through original alongside)
- The +₹1 markup is dropped during the sale (so customer pays exactly the discounted MRP)
- See `lib/active-discounts.ts` — picks the campaign with the highest rupee-saving on each item when multiple compete

---

## 10. Coupons

Five seeded coupons (`prisma/seed-coupons.ts`):

| Code | Type | Effect |
| --- | --- | --- |
| `WELCOME10` | PERCENT | 10% off, max ₹60, min subtotal ₹200 |
| `SAVE50` | FLAT | ₹50 off on orders above ₹499 |
| `FREEDEL` | FREE_DELIVERY | Waives ₹25 delivery on orders above ₹299 |
| `MAGARPATTA20` | PERCENT | 20% off, max ₹100, min subtotal ₹300 |
| `JALEBI` | FLAT | ₹30 off, min subtotal ₹150 |

Coupon discount applies to **subtotal only** (not the convenience or delivery line, except `FREE_DELIVERY` which zeros the delivery line).

---

## 11. Approval & audit machinery

The platform has two parallel queues, by design:

| Queue | Table | Used for | Surfaced at |
| --- | --- | --- | --- |
| **Per-entity approval** | `Vendor.approvalStatus`, `RiderProfile.approvalStatus`, `Campaign.approvalStatus + pendingRemoval` | Onboarding decisions, campaign go-live | `/admin/vendors`, `/admin/riders`, `/admin/campaigns` |
| **Generic config-edit queue** | `PendingChange` | Every menu edit (single-item or curator-forwarded), every campaign edit | `/admin/changes` |
| **Curator pre-queue** | `MenuImportJob` (status enum: `PENDING_CURATOR / CURATED / REJECTED`) | Bulk menu imports only | `/curator` |
| **Cross-portal audit** | `ActivityLog` | Read-only feed of who did what | `/admin/activity` |

Why split? Per-entity approvals are heavy (legal docs, KYC, risk decisions). Config edits are lightweight (rename an item, change a price). PendingChange lets the admin clear small edits in seconds without weighing the whole entity.

---

## 12. Hyper-local rules baked in

- **Geofence**: `lib/societies.ts` defines the polygon. Outside-the-fence addresses get politely declined at signup and at order time.
- **Hub locking**: a cart can mix vendors *within* one hub but never across hubs. The cart drawer raises a "Replace cart?" dialog when the user tries.
- **Two fulfilment modes**:
  - `VENDOR_SELF` — vendor's own staff delivers (Baker's Basket, Starbucks). Vendor sees the order in their dashboard.
  - `PLATFORM_RIDER` (concierge) — vendor not notified; our rider walks into the shop, places the order at the counter, pays from the float, brings it back.
  - Decision rule: every vendor in the cart supports self-delivery → `VENDOR_SELF`; otherwise concierge.
- **Off-platform vendors**: Gulab Paan Corner is on the customer-facing list but has no dashboard, no signin — only concierge fulfilment, no commission.

---

## 13. Demo data + how to run it

### Magarpatta vendors (`prisma/seed-dashboards.ts`)

| Slug | Name | Hub | Type | Mode |
| --- | --- | --- | --- | --- |
| `kalika` | Kalika Sweets | Magarpatta Market | Sweets | Concierge |
| `bakers` | The Baker's Basket | Seasons Mall | Bakery | Self-delivery |
| `dosa-house` | Demo Dosa House (PENDING) | Magarpatta Market | Restaurant | — |
| `dc` | Destination Centre | DC | Grocery | Concierge |
| `shraddha` | Shraddha Meats | Magarpatta Market | Meat | Concierge |
| `mg-pharmacy` | Magarpatta Pharmacy | Magarpatta | Pharmacy | Concierge |
| `starbucks` | Starbucks · Seasons | Seasons Mall | Cafe | Self-delivery |
| `gulab-paan` | Gulab Paan Corner | Magarpatta Market | Sweets | Off-platform / concierge |

### Amanora vendors (`prisma/seed-amanora.ts`)

Different shops, different phone ranges (`9100000001`–`9100000007`), all using local `/products/*` images. Seeded into the Amanora Neon DB.

| Slug | Name | Hub | Type | Mode |
| --- | --- | --- | --- | --- |
| `theobroma-am` | Theobroma Patisserie | Amanora Mall | Bakery | Self-delivery (₹25) |
| `trattoria-am` | Trattoria Italiano | Amanora Town Centre | Restaurant | Concierge |
| `bloom-am` | Cafe Bloom | Amanora Mall | Cafe | Self-delivery (₹30) |
| `medplus-am` | MedPlus · Amanora | Amanora Mall | Pharmacy | Concierge |
| `starbazaar-am` | Star Bazaar · Amanora | Amanora Town Centre | Grocery | Concierge |
| `freshcuts-am` | Fresh Cuts Meat Co. | Amanora Main Road | Meat | Concierge |
| `burger-am` | The Burger Co. (PENDING) | Amanora Main Road | Restaurant | — |
| `paan-republic-am` | Paan Republic | Amanora Town Centre | Sweets | Off-platform / concierge |

Full credentials (vendor logins, riders, admin, curator) in `docs/ACCESS.md`.

### Categories (`prisma/seed-catalog.ts`)

`sweets-snacks`, `produce`, `dairy`, `groceries`, `bakery`, `meat`, `medicines`, `beverages`, `essentials`. Both seeders upsert these idempotently.

### Local dev

```powershell
cd C:\projects\magarpatta-delivery
pnpm install
pnpm dev               # → http://localhost:3000  (defaults to Magarpatta)
SITE_SLUG=amanora pnpm dev    # local Amanora preview against the same DB or a local one
```

### Re-seeding (idempotent)

```powershell
# Magarpatta
cd apps\web
npx vercel env pull .env --environment=production
npx prisma db push
npx -y dotenv-cli -e .env -- npx tsx prisma/seed-dashboards.ts

# Amanora
$env:DATABASE_URL = "<paste Amanora Neon connection string>"
npx prisma db push
npx tsx prisma/seed-amanora.ts
```

---

## 14. Known caveats / things to fix before launch

1. **`DEMO_MODE = true`** in `lib/otp.ts` — every phone accepts `123456`. Flip to `false` and set `FAST2SMS_API_KEY` before genuine launch.
2. **Build-time `prisma db push --accept-data-loss`** in `apps/web/package.json` — auto-syncs schema on every Vercel deploy. Fine for demo, dangerous once real customer data is flowing. Switch to `prisma migrate deploy`.
3. **Curator bootstrap** — `/api/curator/session/route.ts` auto-provisions phone `7000000001` on first signin (so we don't need to re-seed prod). Replace with an admin-only `POST /api/admin/curators` endpoint.
4. **Firebase phone auth** dead code — `lib/firebase-phone.ts` + `/api/auth/firebase-session/route.ts` no longer used anywhere. Delete.
5. **MTDCC MoU** — non-negotiable launch prerequisite, not in place.
6. **Order updates** are pull-based (refetch on tracking page). For genuine launch, add SSE or websockets so the customer sees rider movement live.
7. **No image upload** for product photos yet — vendors can only paste an `imageUrl`. Recommended next step: Vercel Blob + a small `<ImagePicker>` component.

---

## 15. Where to find the wireframes

`wireframes/` has 16 hand-authored SVG mocks at iPhone 14 Pro dimensions — six customer screens, five vendor, five rider — using the real seeded catalog data and the same Tailwind colour tokens as the deployed app. Drag any SVG into Figma to see it; the README in that folder explains how to import as editable Figma layers via the html.to.design plugin.

---

*Doc maintained alongside the code. If you change a feature and forget to update this file, the file is wrong. Trust the code.*
