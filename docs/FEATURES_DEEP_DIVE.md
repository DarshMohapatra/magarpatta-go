# Feature Deep Dive

> **Last sync:** 2026-04-29. Companion to `docs/FEATURES.md` (which lists every feature briefly). This doc unpacks four flagship features end-to-end so you can answer "but how does it actually work" questions without reading source: multi-instance / site config, the campaigns engine, the COD trust ladder, and the photo / QR / paste menu importer.
>
> All file paths are relative to `apps/web/`. Citations are `file:line` so you can verify in the IDE.

---

## 1 — Multi-instance (site config)

### What it is

One repo, multiple deployments. Each deployment serves exactly one locality (Magarpatta City, Amanora Park Town, …) with its own database, its own admin team, its own customers. There is no cross-instance data sharing — the isolation is at the infrastructure layer, not at the schema layer.

Live today:

| Instance | URL | DB | `SITE_SLUG` |
| --- | --- | --- | --- |
| Magarpatta City | https://web-eta-ebon-80.vercel.app | Neon · `ep-sparkling-unit-a15ht5fc` | `magarpatta` |
| Amanora Park Town | https://amanora-go.vercel.app | Neon · `ep-silent-surf-aot5k4aa` | `amanora` |

### Why we did it this way

We considered a multi-tenant model — one DB, one app, customers and admins choose their site inside one shared deployment. Rejected because:

1. **Data isolation by accident** — if a query forgets a `siteId` filter once, every customer in every site sees every other site's vendors. Multi-instance makes that class of bug structurally impossible: each site has its own DB.
2. **Brand independence** — each site can pick its own platform name (`Magarpatta Go`, `Amanora Go`) without the other being affected.
3. **Operational independence** — a bad deploy on Amanora doesn't touch Magarpatta. Each site has its own admin team, its own SSL certs, its own custom domain.
4. **Trivial to scale** — adding a third site is a config-only change. No migration, no schema bump, no carved-out data.

The catch: there is **no super-admin pane of glass** today. Each instance has its own admin console; the same human just signs into both. A future cross-instance dashboard (read-only, polls each site's API) is acknowledged as a separate project.

### How it works

The active site is picked at module init by `lib/site-config.ts:22`:

```ts
const slug = (
  process.env.NEXT_PUBLIC_SITE_SLUG ||
  process.env.SITE_SLUG ||
  'magarpatta'
).trim();
export const siteConfig = getSiteConfig(slug);
```

`getSiteConfig` (`lib/sites/index.ts:13`) is a registry lookup that throws on an unknown slug — fail-fast at boot rather than serve a half-configured app. Defaults to `magarpatta` if both env vars are unset, so the existing production deployment keeps working without any env-var change.

Each site's data lives in its own file:

- `lib/sites/magarpatta.ts` — 16 societies, 259 buildings, geofence polygon, "Magarpatta City" / "Magarpatta Go" branding, `defaultHub: 'Magarpatta'`, `demoCuratorPhone: '7000000001'`
- `lib/sites/amanora.ts` — 11 clusters, 60 towers (lifted from the township directory PDF), approximate Hadapsar polygon, "Amanora Park Town" / "Amanora Go", `demoCuratorPhone: '7000000002'`

The `SiteConfig` shape is at `lib/sites/types.ts:12`:

```ts
slug, siteName, platformName, wordmarkRoot,
city, state, pincode, tagline,
geofencePolygon: Array<[lng, lat]>,
societies: SiteSociety[],
defaultHub, hubSuggestions, demoCuratorPhone
```

### Where it ripples through the codebase

- **Address validation** (`lib/societies.ts`) is now a thin facade over `siteConfig.societies`. Every old export (`MAGARPATTA_SOCIETIES`, `getBuilding`, `validateFlat`, `isVerifiedAddress`, `parseFlat`) preserved verbatim so dozens of call sites keep working with zero changes.
- **Geofence check** (`app/api/geofence/check/route.ts`) reads `siteConfig.geofencePolygon` at request time; "outside Magarpatta" copy now interpolates `${siteConfig.siteName}`.
- **Brand wordmarks** (every shell + footer + auth panel) read `${siteConfig.wordmarkRoot} <em>Go</em>` — Magarpatta deploy renders "Magarpatta Go", Amanora deploy renders "Amanora Go".
- **Curator bootstrap** (`app/api/curator/session/route.ts:16`) auto-provisions `siteConfig.demoCuratorPhone` as `${siteConfig.siteName} Curator`. So Magarpatta seeds `7000000001` → "Magarpatta Curator"; Amanora seeds `7000000002` → "Amanora Curator".
- **Vendor signup default hub** (`app/vendor/register/register-client.tsx`) pulls from `siteConfig.defaultHub` and shows `siteConfig.hubSuggestions.join(' / ')` as placeholder text.

### Onboarding a new site

Step-by-step in `docs/ONBOARDING_NEW_SITE.md`. TL;DR:

1. Add `lib/sites/<slug>.ts` with the directory + polygon + brand strings.
2. Register it in `lib/sites/index.ts`.
3. Spin up a new Neon DB, copy the connection string.
4. Create a new Vercel project pointing at the same git repo (root: `apps/web`).
5. Set env vars on the new project: `SITE_SLUG=<slug>`, `NEXT_PUBLIC_SITE_SLUG=<slug>`, `DATABASE_URL=<new neon url>`, `OTP_DEMO_MODE=true`.
6. First deploy auto-runs `prisma db push` against the new DB.
7. `pnpm tsx prisma/seed-amanora.ts` (or write a parallel `seed-<slug>.ts`) to seed demo accounts.
8. Configure custom domain.

### Edge cases

- **Demo phone collisions across instances** — Magarpatta seeds vendor phones `9000000001`–`9000000007`, riders `8888888801`–`05`, admin `9999999999`. Amanora deliberately uses different ranges (`9100000001`+, `8888889001`+, `9999999888`) so a tester can sign in to either instance from the same browser without phone-conflict drama. The cart-on-signin wipe (see §4 of FEATURES.md) is the second line of defence.
- **Same Firebase project for both** — both deployments share the legacy Firebase Phone Auth project (`magarpattago`). Phone numbers are global; the Firebase client config is public; sharing it is fine. We made `lib/firebase-admin.ts` lazy-init so a deployment without the server-side Firebase Admin creds doesn't break the build (`lib/firebase-admin.ts:13`).
- **Marketing demo arrays** (`components/live-orders.tsx`, `components/landing-pulse.tsx`, `components/partners.tsx`) still reference Magarpatta-specific society / vendor names. Acceptable on Magarpatta; mildly inconsistent on Amanora. To fully fix, move into a per-site `siteConfig.demoLiveOrders` field. Not blocking.

---

## 2 — Campaigns

### What it is

A vendor-driven discount engine. A campaign discounts one or more of a vendor's products by either a percentage or a flat ₹ amount, for a window in time, scoped to either the entire menu or a hand-picked subset. Admin must approve before a campaign goes live; admin must approve removal too (so a vendor can't blink-cancel mid-rush).

The customer sees:
- Strikethrough MRP + the new price on each affected product card
- A coloured `Sale` chip with the campaign title in the cart breakdown
- Coupons disabled with "campaign discount can't stack" copy when the cart already has a campaign price baked in

### Why approval gates on both sides

Vendor side: stops drive-by 70%-off campaigns from hitting the menu without ops oversight (cost-of-goods checks, MRP-locked rule, festival timing).

Removal side: a vendor can't yank a still-running campaign that already has carts in flight. They request removal → it stays live until admin approves the takedown. Carts that priced against the campaign keep their lower price; new carts after the takedown see the regular price.

### Schema

`prisma/schema.prisma` model `Campaign`:

| Field | Why |
| --- | --- |
| `vendorId` | The owning vendor |
| `type` | Enum: `WEEKEND`, `FESTIVAL`, `LATE_NIGHT`, `FLASH` etc. — drives the visual chip and the coupon-style code |
| `title` | Free-text; surfaces in the customer's cart breakdown ("Festival Special") |
| `discountPct` | Optional — % off. Mutually exclusive in spirit with the next field. |
| `discountFlatInr` | Optional — flat ₹ off. Either pct or flat, never both meaningful. |
| `appliesToAll` | If `true`, every product on the vendor's menu is discounted. Otherwise `Campaign.products[]` (m2m) decides. |
| `startsAt`, `endsAt` | Time window. Outside it the campaign is hidden. |
| `approvalStatus` | `PENDING` / `APPROVED` / `REJECTED` |
| `pendingRemoval` | If `true`, vendor wants this campaign deleted but admin hasn't approved yet. |

### How a campaign is created

1. Vendor opens `/vendor/campaigns`, fills in: type, title, % or ₹, scope (whole menu / picked items), date-time window.
2. Submit hits `POST /api/vendor/campaigns` (`app/api/vendor/campaigns/route.ts`) — creates the row with `approvalStatus: 'PENDING'`. Admin overview gets a `+1` in the "Campaigns awaiting review" stat (`app/admin/page.tsx:22` — query also counts `pendingRemoval`).
3. Admin opens `/admin/campaigns`, reviews title + scope + window, hits Approve or Reject. The Approve handler at `app/api/admin/campaigns/[id]/approve/route.ts` flips `approvalStatus: 'APPROVED'`.
4. The next customer page render (or a stale-while-revalidate ISR fetch) picks up the active campaign via `getActiveDiscounts()` (`lib/active-discounts.ts`).

### How customer prices get re-derived

The cart never trusts a price the customer's browser sent. On every order placement, `app/api/orders/route.ts:81` re-derives the price for each line:

```ts
const match = discountFor({ id, vendorId, isRegulated, priceInr, mrpInr }, activeDiscounts);
const priced = applyDiscount({ priceInr, mrpInr, isRegulated }, match.saving, match.campaign);
```

- `discountFor()` picks the campaign that gives the largest *rupee* saving on this product. Both `discountPct` and `discountFlatInr` are converted to a rupee-saving number for comparison so a 20%-off and a flat ₹50-off can be compared apples to apples on the same product.
- `applyDiscount()` returns `{ priceInr, mrpInr, originalMrpInr, discountPct, discountFlatInr }`. `originalMrpInr` is non-null when the product was in fact discounted — the cart card uses it to show the strikethrough.
- **Regulated goods** (medicines, packaged staples — `isRegulated=true`) are skipped entirely. Legal Metrology Rules 2011 require them to sell at MRP; the campaign engine no-ops on them even if `appliesToAll=true`.
- **Coupon vs. campaign** — at the breakdown step (`computeBreakdown` in `lib/pricing.ts`), if any line carries a campaign saving, an attempt to apply a coupon code is rejected with "A campaign discount is already applied — coupons can't stack" (`app/api/orders/route.ts:99`). This avoids the customer-confusing "I got 50% off and another 10% off" stack.

### Removal flow

Vendor hits Remove on `/vendor/campaigns` → `PATCH /api/vendor/campaigns/[id]` sets `pendingRemoval: true` (the campaign stays live). The admin overview's "Campaigns awaiting review" count includes `OR: [{ approvalStatus: 'PENDING' }, { pendingRemoval: true }]` (`app/admin/page.tsx:22`) so admin sees both new submissions and removal requests in one place. Admin approve = delete the row; admin reject = clear `pendingRemoval`.

### What the customer sees end-to-end

- **Restaurant card** — discount chip on a vendor card if any of their items are under a campaign
- **Product card** — strikethrough MRP + new price + small coloured Sale chip ("₹50 off" or "20% off" or campaign title)
- **Cart drawer + checkout** — line item shows new price; sidebar has a green "Sale · Festival Special" line with the rupee-savings total
- **Order detail / receipt** — the saved `Order.discountInr` reflects what was actually applied; the snapshot is permanent (campaigns can be edited later but old orders keep their original price).

---

## 3 — Cash on Delivery (COD) flow

### What it is

A graduated trust ladder for whether a customer can pay COD. New customers can't. Customers who've completed N successful prepaid orders can. Admin can short-circuit and pre-approve a customer (corporate accounts, known regulars) without making them prepay first. There's also a per-order rupee cap so even a trusted customer can't COD a ₹5,000 order.

### Why

COD is a customer convenience but the platform's risk: a no-show address means a wasted rider trip and the food itself. Three things mitigate:
1. **Prepaid history threshold** — make the customer prove their address is real and they're reachable on the phone before unlocking COD.
2. **Per-order cap** — even after they've earned COD, a high-value order goes back to prepaid. Caps the blast radius of a single rejected delivery.
3. **Admin override** — for the friction case where a stale demo account or a known business customer needs COD on day one.

### The thresholds

`lib/cod.ts:8`:

```ts
export const COD_PREPAID_THRESHOLD = 3;
export const COD_MAX_ORDER_INR = 500;
```

A customer is COD-eligible when **either**:
- `prepaidCount >= 3` — count of their `Order` rows with `status = 'DELIVERED' AND paymentMethod != 'COD'`, OR
- `User.codApprovedByAdmin = true`

AND the order's total ≤ ₹500.

### How the customer experiences it

The COD tile **does not appear at all** when the customer isn't eligible — no disabled state, no "you need to prepay 3 more times" copy. Just a 3-tile payment grid (Card, UPI, Net Banking) instead of 4. This is intentional — earlier the disabled tile had a chip reading "Verify address for COD" and the founder told us it looked unprofessional (Screenshot 2026-04-29 100334). Now it's silently absent until they qualify.

The check lives at `app/checkout/checkout-client.tsx:80`:

```ts
const codAvailable = cod.eligible && total <= cod.maxOrderInr;
if (payMethod === 'COD' && !codAvailable) {
  setPayMethod('CARD');
}
```

The eligibility object is computed server-side and passed via the Next.js page (`app/checkout/page.tsx`). The customer never gets to read `cod.eligible` directly — they just see whichever payment tiles are rendered.

### Server-side enforcement

The client-side hide is UX. The actual gate is at `app/api/orders/route.ts:142`, after the price breakdown is computed (so the total reflects discounts and the cap is checked against the *real* charged amount):

```ts
if (paymentMethod === 'COD') {
  const cod = await getCodEligibility(db);
  if (!cod.eligible) {
    const remaining = Math.max(1, cod.threshold - cod.prepaidCount);
    return NextResponse.json(
      { ok: false, error: `Pay online for ${remaining} more order${remaining === 1 ? '' : 's'} to unlock cash on delivery.` },
      { status: 400 },
    );
  }
  if (breakdown.totalInr > COD_MAX_ORDER_INR) {
    return NextResponse.json(
      { ok: false, error: `Cash on delivery is capped at ₹${COD_MAX_ORDER_INR}. Pay online for orders above this amount.` },
      { status: 400 },
    );
  }
}
```

A tampered request (curl with `paymentMethod: 'COD'` and a forged total) is rejected here even if the client-side hide failed. The error message is descriptive enough for a legitimate user but doesn't leak the threshold value to a probe.

### Admin override

`/admin/customers` shows every customer with a "COD status" column. Three states render:

- `2/3 prepaid` — ineligible, working towards the threshold
- `COD · earned` — eligible automatically (>= 3 prepaid orders)
- `COD · admin` — admin-approved, prepaid count irrelevant

Each row has Approve / Revoke. The toggle hits `POST /api/admin/customers/[id]/cod` (`app/api/admin/customers/[id]/cod/route.ts`), which flips `User.codApprovedByAdmin` and writes an `ActivityLog` entry (`CUSTOMER_COD_APPROVED` / `CUSTOMER_COD_REVOKED`) so there's an audit trail of who approved whom.

### Why prepaid-count is computed live (not cached)

`getCodEligibility(db)` (`lib/cod.ts:30`) does:

```ts
const [user, prepaidCount] = await Promise.all([
  db.user.findFirst({ where: {}, select: { codApprovedByAdmin: true } }),
  db.order.count({ where: { status: 'DELIVERED', paymentMethod: { not: 'COD' } } }),
]);
```

Both queries go through the **customer-fence** Prisma extension (`lib/customer-db.ts`) — the empty `where: {}` is automatically narrowed to `userId = <session user>` server-side, so this helper structurally cannot read another user's eligibility.

Live count instead of a cached `User.prepaidOrderCount` field avoids the bug class where the counter drifts (refunds, status changes, reseed). Cheap query, single user, indexed FK.

---

## 4 — Reading menus from photo / QR / paste

### What it is

A vendor onboarding accelerator. Instead of typing 60 menu items manually into the dashboard, the vendor:

- **Photo path** — opens `/vendor/menu/import`, picks "Photo", uploads (or live-camera-captures) one or more images of their printed menu. The browser does Tesseract OCR client-side, the parser extracts `{ name, mrpInr, unit }` rows, the vendor reviews a preview… or now (post-curator change) submits them as a `MenuImportJob` for the curator to verify.
- **QR path** — points the camera at the QR on their printed menu. If the QR encodes a URL, our scraper fetches it server-side (with private-IP / SSRF guards), strips the HTML, and runs the same parser. If the QR encodes plain menu text, that text goes straight to the parser.
- **Paste path** — pastes raw text from somewhere (Notes app, WhatsApp, etc.). Same parser runs.

In every path the output is the same shape: a list of parsed rows that get bundled into a `MenuImportJob` and sent for curator review.

### Why all three modes

Real-world Indian restaurants ship menus in three formats: a laminated printed sheet (photo), a stuck-on-the-wall QR pointing to a Google Doc / Zomato link (QR), or a vendor's WhatsApp text dump (paste). Catching all three covers the long tail.

### The OCR pipeline (photo path)

Lives client-side in `app/vendor/menu/import/import-client.tsx`. Tesseract.js runs in a web worker; we make a few preprocessing decisions before handing the image to it:

1. **Otsu adaptive thresholding** — convert the photo to a binarised black-on-white image. Auto-inverts if the menu was white-on-black.
2. **Upscale** — small phone photos OCR badly. We bilinear-upscale to ~1500px on the long edge.
3. **Vertical projection profiling for column detection** — many printed menus are two-column. The image is split into column slices using a vertical-projection histogram (run-of-white-rows = column gap), and each column is OCR'd separately. This stops "Dal Tadka 180 Aloo Paratha 90" from being read as one corrupted line.
4. **Multi-pass OCR** — three passes per column with different Page Segmentation Modes (PSM 6 = uniform block, PSM 4 = single column, PSM 11 = sparse text). The text outputs are merged.

### The parser

`lib/menu-parser.ts`. Given the OCR text dump, it splits into lines and runs each through:

- **Price line regex** — `/^(.+?)[\s.\-—–:_·•=>]*(?:rs\.?|inr|₹)?\s*(\d{2,4})(?:\.\d{1,2})?(?:\/?-)?\s*$/i` — matches "Dal Tadka 180", "Paneer Butter Masala — Rs. 320/-", "Cold Coffee · 140", etc.
- **`correctPrice()`** — Tesseract often reads "180.00" as "18000" because the decimal point disappears in low-res print. If a 4-digit price ends in "00", we reinterpret as a decimal artifact (1800 → 180, 32000 → 320). Clamped to a sane range.
- **`stripEmbeddedPrices()`** — handles the multi-column merge case: "Dal 180 Roti 30" → drop everything before the last embedded number, treat the trailing item as a separate row.
- **`looksLikeNoise()`** — rejects lines with too few letters or a majority of one-character words. Tesseract's "let me try to read these page numbers and ornamental dingbats" output goes here.
- **`extractUnit()`** — detects "half", "full", "250g", "200ml", "1 piece" suffixes from the name and pulls them into the `unit` field.

Output: `Array<{ name, mrpInr, unit }>`.

### The curator handoff

Earlier the vendor saw the parsed table and edited rows directly. We removed that — the founder said vendors shouldn't see OCR mistakes; it makes the platform look unreliable. Now:

1. Vendor's browser sends the parsed items + original image bytes (compressed JPEG, base64) to `POST /api/vendor/menu/import` (`app/api/vendor/menu/import/route.ts`).
2. The route creates a `MenuImportJob` row with `status: 'PENDING_CURATOR'`, plus `MenuImportImage` rows holding the original photo bytes (stored as Postgres `Bytes` columns to avoid the Vercel Blob dependency).
3. The vendor sees a quiet "Submitted for review" card. No editable preview, no accuracy hint banner, no "the OCR caught 87% of items" copy.
4. The curator (a human) opens `/curator`, sees the queue. Each job opens at `/curator/[jobId]` showing the original photo on the left and the parsed item table on the right.
5. The curator can edit any field on any row, add missing items the OCR dropped, delete OCR noise rows, or reject the whole job with a note (which goes back to the vendor as the rejection reason).
6. **The curator only sees MRP** — not price. The +₹1 convenience fee is auto-applied at cart time, and exposing two columns ("MRP" vs "what we sell at") confuses the curator. The API derives `priceInr = isRegulated ? mrpInr : mrpInr + 1` server-side at approve time (`app/api/curator/jobs/[id]/approve/route.ts`).
7. On approve, each row becomes a `PRODUCT/CREATE` `PendingChange` — exactly what a single-item add would create. The curator's job ends here; admin's existing approval queue takes over.

### Why curator + admin (not just admin)

- **Bulk imports are noisy.** A 60-item OCR pass typically has 10–15 corrections needed. If those landed in admin's queue as 60 separate `PendingChange` rows, admin would either rubber-stamp (defeat the point) or take 30 minutes per vendor.
- **Curator's mental model** is fundamentally different — they're verifying *parsing accuracy* against the original photo. Admin verifies *business rules* — pricing, regulated-MRP correctness, FSSAI compliance.
- **Single-item edits skip the curator.** When a vendor types one new item into `/vendor/menu`, that's vendor-curated already; it goes straight to admin's `PendingChange` queue. Only bulk imports route through curator.

### QR path specifics

`app/api/vendor/menu/scrape/route.ts` accepts a URL from a successful QR scan. The route:

- Blocks private / loopback IPs (rough SSRF guard) — checks the parsed URL host against a hardcoded set of CIDR-ish blocklists.
- Limits response size to 1.5 MB and 8 seconds.
- Sends a polite User-Agent: `${siteConfig.platformName.replace(/\s/g, '')}-MenuImport/1.0`.
- Sniffs the response Content-Type. HTML is run through `htmlToText` (in-house, kills scripts/styles, preserves heading + list breaks). Plain text passes through directly.

The cleaned text feeds into the same parser as the photo path. From there it's the same MenuImportJob → curator → admin pipeline.

### Edge cases worth remembering

- **Tesseract accuracy ceiling on free OCR** — empirically ~70% on dense decorative posters even after our preprocessing. Pushing beyond that needs a paid OCR (Google Document AI, AWS Textract). The curator is our human ceiling-breaker — rather than chase OCR perfection, we accept ~70% and have a person review.
- **Multi-page menus** — the importer accepts multiple images per submission. They're stored as separate `MenuImportImage` rows, ordered, and the curator paginates between them on the review page.
- **Decimal-point loss** — "₹180.00" → OCR reads "18000". Caught by `correctPrice()` (4 digits ending `00` → divide by 100). False-positive risk: a real 4-digit price ending in 00 (₹2,000 fine-dining set menu). Mitigation: if both `XX00` and `YY00` patterns appear and the lower 2 digits are always `00`, we leave them alone.
- **Vendor signs up but doesn't get approved** — the import button is disabled at `/vendor/menu/import` until `vendor.approvalStatus === 'APPROVED'`. The customer-facing menu API also filters approved-only.

---

## See also

- `docs/FEATURES.md` — every feature briefly
- `docs/ACCESS.md` — demo URLs + creds for both instances
- `docs/ONBOARDING_NEW_SITE.md` — the runbook for spinning up a third site
- `docs/ROADMAP.md` — what's next
