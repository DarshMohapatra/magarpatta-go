# Magarpatta Go · Access & URLs

> Demo credentials. Rotate before real launch. This file is committed intentionally for the Phase‑1/Phase‑2 demo — treat it like a README, not a secrets vault.

## Two live instances

The codebase is **multi-instance**: one repo, many deployments, each with its own database. Each instance is configured at build time by the `SITE_SLUG` env var and serves a single locality. Onboarding details: `docs/ONBOARDING_NEW_SITE.md`.

| Instance | URL | DB host | `SITE_SLUG` |
| --- | --- | --- | --- |
| **Magarpatta City** (production) | https://web-eta-ebon-80.vercel.app | Neon · `ep-sparkling-unit-a15ht5fc` | `magarpatta` (default) |
| **Amanora Park Town** | https://amanora-go.vercel.app | Neon · `ep-silent-surf-aot5k4aa` | `amanora` |

Each instance has its own admin, vendors, riders, curator, customers — they share zero data. The same human can have admin credentials on both.

---

## Super Admin · cross-instance supervisor

Sits **above** the per-instance admins. One human, one login, sees a live aggregate of every site and can drill into each one. Read-only by design — every write still goes through the instance's own admin console.

| Field | Value |
| --- | --- |
| URL | https://super-admin-go.vercel.app |
| Sign-in | https://super-admin-go.vercel.app/super-admin/signin |
| Phone | `9999999000` |
| Password | `superadmin@2026` |
| Vercel project | `super-admin-go` (separate from `web` and `amanora-go`) |

### How it works

The super-admin host is a dedicated Vercel deployment of the same repo with `SUPER_ADMIN_HOST=true` set. Its middleware redirects every path except `/super-admin/*` to the signin page, so even though it ships with the full app code, no customer/vendor/rider routes are reachable here.

Each instance exposes `GET /api/super-admin/snapshot` (gated by a shared bearer secret). The super-admin host polls every instance listed in `SUPER_ADMIN_INSTANCES` and renders the combined dashboard at `/super-admin`.

| Env var | Where it lives | Purpose |
| --- | --- | --- |
| `SUPER_ADMIN_HOST=true` | super-admin-go only | Activates the lockdown middleware |
| `SUPER_ADMIN_PHONE` | super-admin-go only | Login phone (`9999999000`) |
| `SUPER_ADMIN_PASSWORD_HASH` | super-admin-go only | sha256 hex of the password |
| `SUPER_ADMIN_INSTANCES` | super-admin-go only | `magarpatta=...,amanora=...` |
| `SUPER_ADMIN_SHARED_SECRET` | **all three projects** | Same value on each — bearer token for the snapshot poll |

### Rotating the password

```powershell
# 1. Pick a new password and compute its sha256
node -e "console.log(require('crypto').createHash('sha256').update('NEW_PASSWORD').digest('hex'))"

# 2. Update SUPER_ADMIN_PASSWORD_HASH on the super-admin-go project (Vercel dashboard or CLI)
# 3. Redeploy super-admin-go for the new hash to take effect
# 4. Update this file
```

Rotating `SUPER_ADMIN_SHARED_SECRET` requires updating it on **all three** projects (super-admin-go, web, amanora-go) and redeploying each — or the snapshot calls will start returning 401.

---

## Magarpatta City — URLs

| Role | URL |
| --- | --- |
| Customer app | https://web-eta-ebon-80.vercel.app |
| Customer sign in | https://web-eta-ebon-80.vercel.app/signin |
| Customer sign up | https://web-eta-ebon-80.vercel.app/signup |
| Partner hub (marketing) | https://web-eta-ebon-80.vercel.app/partner |
| Vendor landing | https://web-eta-ebon-80.vercel.app/partner/vendor |
| Vendor register | https://web-eta-ebon-80.vercel.app/vendor/register |
| Vendor sign in | https://web-eta-ebon-80.vercel.app/vendor/signin |
| Rider landing | https://web-eta-ebon-80.vercel.app/partner/rider |
| Rider register | https://web-eta-ebon-80.vercel.app/rider/register |
| Rider sign in | https://web-eta-ebon-80.vercel.app/rider/signin |
| Admin landing | https://web-eta-ebon-80.vercel.app/partner/admin |
| Admin sign in | https://web-eta-ebon-80.vercel.app/admin/signin |
| Admin activity feed | https://web-eta-ebon-80.vercel.app/admin/activity |
| Curator sign in | https://web-eta-ebon-80.vercel.app/curator/signin |
| Curator queue | https://web-eta-ebon-80.vercel.app/curator |
| Curator history | https://web-eta-ebon-80.vercel.app/curator/history |
| Helpdesk sign in | https://web-eta-ebon-80.vercel.app/helpdesk/signin |
| Helpdesk queue (open) | https://web-eta-ebon-80.vercel.app/helpdesk |
| Helpdesk resolved | https://web-eta-ebon-80.vercel.app/helpdesk/resolved |
| Customer support tickets | https://web-eta-ebon-80.vercel.app/support |
| Customer file new ticket | https://web-eta-ebon-80.vercel.app/support/new |
| Admin support oversight (read-only) | https://web-eta-ebon-80.vercel.app/admin/support |

## Amanora Park Town — URLs

| Role | URL |
| --- | --- |
| Customer app | https://amanora-go.vercel.app |
| Customer sign in | https://amanora-go.vercel.app/signin |
| Customer sign up | https://amanora-go.vercel.app/signup |
| Partner hub | https://amanora-go.vercel.app/partner |
| Vendor sign in | https://amanora-go.vercel.app/vendor/signin |
| Vendor register | https://amanora-go.vercel.app/vendor/register |
| Rider sign in | https://amanora-go.vercel.app/rider/signin |
| Rider register | https://amanora-go.vercel.app/rider/register |
| Admin sign in | https://amanora-go.vercel.app/admin/signin |
| Admin activity feed | https://amanora-go.vercel.app/admin/activity |
| Curator sign in | https://amanora-go.vercel.app/curator/signin |
| Curator queue | https://amanora-go.vercel.app/curator |
| Helpdesk sign in | https://amanora-go.vercel.app/helpdesk/signin |
| Helpdesk queue | https://amanora-go.vercel.app/helpdesk |
| Customer support tickets | https://amanora-go.vercel.app/support |
| Admin support oversight (read-only) | https://amanora-go.vercel.app/admin/support |

### Local dev

```powershell
cd C:\projects\magarpatta-delivery
pnpm dev
```
Then http://localhost:3000 for the customer site; same `/vendor`, `/rider`, `/admin` paths work.

---

## Auth · one unified system (DEMO_MODE on)

Every signin and signup — customer, vendor, rider, admin, curator — flows through the server-owned OTP system in `apps/web/lib/otp.ts`. Firebase phone auth is no longer in any user-facing path (`/api/auth/firebase-session` and `lib/firebase-phone.ts` are unused; safe to delete before launch).

> **DEMO_MODE flag** — `apps/web/lib/otp.ts` ships with `const DEMO_MODE = true`. While true, **every phone on every flow accepts the static OTP `123456`** and Fast2SMS is bypassed entirely. Flip to `false` before genuine launch; the seeded demo phones below keep `123456` even after the flag flips (via the explicit `DEMO_PHONES` allow-list).

### Server OTP details

| Aspect | Value |
| --- | --- |
| Purpose codes | `CUSTOMER_SIGNIN` · `VENDOR_SIGNIN` · `VENDOR_REGISTER` · `RIDER_SIGNIN` · `RIDER_REGISTER` · `ADMIN_SIGNIN` · `CURATOR_SIGNIN` · `HELPDESK_SIGNIN` |
| OTP length | 6 digits |
| Expiry | 5 minutes from send |
| Resend cooldown | 30 seconds per `(phone, purpose)` |
| Max wrong attempts | 5 — then the code is invalidated and you must resend |
| Single-use | Consumed on successful verify; `consumedAt` stamped |
| SMS provider | Fast2SMS — `route=otp` (only used when `DEMO_MODE=false`) |
| Demo OTP | **`123456`** — accepted on every phone while `DEMO_MODE=true` |
| Storage | sha256 hash only; plaintext never persisted |

### API surface

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/otp/send` | Send OTP for any role · body `{ phone, purpose }` |
| `POST /api/auth/otp/signin` | Customer verify → sets `mg_session` (upserts the User row — signin = signup) |
| `POST /api/vendor/session` | Vendor verify → sets `mg_vendor_session` |
| `POST /api/rider/session` | Rider verify → sets `mg_rider_session` (approved only) |
| `POST /api/admin/session` | Admin verify → sets `mg_admin_session` |
| `POST /api/curator/session` | Curator verify → sets `mg_curator_session` |
| `POST /api/helpdesk/session` | Helpdesk verify → sets `mg_helpdesk_session` |
| `POST /api/vendor/register` | Creates PENDING vendor after OTP verify |
| `POST /api/rider/register` | Creates PENDING rider after OTP verify |

---

## Vendor catalogue (full detail)

All vendors approved + active unless noted. Sign in is OTP at `/vendor/signin`. Pending vendors can&apos;t sign in until an admin flips them to APPROVED.

### 1 · Kalika Sweets · `kalika`

| Field | Value |
| --- | --- |
| Hub | Magarpatta Market |
| Type | sweets |
| Description | Fresh-from-the-kadhai sweets and snacks. Institutional Magarpatta since 1998. |
| Hours | 08:00–22:30 |
| Address | Shop 4, Magarpatta Market, Hadapsar |
| Owner | Rajesh Kalika · `9000000001` |
| Email | owner@kalika.example |
| OTP | `123456` |
| Fulfilment | **Concierge / platform rider** — vendor not notified; rider walks in & buys |
| GSTIN | 27AAAPL1234C1Z5 |
| FSSAI | 11521998000123 |
| PAN | AAAPL1234C |
| Bank | Kalika Sweets & Snacks · `50100123456789` · HDFC0001234 |
| UPI | `kalika@hdfcbank` |
| Commission | 15% |

### 2 · The Baker&apos;s Basket · `bakers`

| Field | Value |
| --- | --- |
| Hub | Seasons Mall |
| Type | bakery |
| Description | Sourdough, croissants, seasonal loaves. Still-warm deliveries every morning. |
| Hours | 07:00–23:00 |
| Address | Ground floor, Seasons Mall, Magarpatta |
| Owner | Priya Menon · `9000000002` |
| Email | hello@bakersbasket.example |
| OTP | `123456` |
| Fulfilment | **Self-delivery** · ₹20 fee · vendor sees orders in their dashboard |
| GSTIN | 27BAKPL4321M1Z9 |
| FSSAI | 11521998000456 |
| PAN | BAKPL4321M |
| Bank | The Baker's Basket LLP · `00222244446666` · ICIC0000222 |
| UPI | `bakers@icici` |
| Commission | 18% |

### 3 · Destination Centre · `dc`

| Field | Value |
| --- | --- |
| Hub | Destination Centre |
| Type | grocery |
| Description | The township&apos;s flagship grocery + supermarket. Everything, one aisle away. |
| Hours | 08:00–23:00 |
| Address | Destination Centre, Magarpatta City, Hadapsar |
| Owner | Anil Deshmukh · `9000000004` |
| Email | owner@dc.example |
| OTP | `123456` |
| Fulfilment | **Concierge / platform rider** |
| GSTIN | 27DCLPL5678N1Z8 |
| FSSAI | 11521998000234 |
| PAN | DCLPL5678N |
| Bank | Destination Centre Retail Pvt Ltd · `40012345678900` · AXIS0000321 |
| UPI | `dc@axisbank` |
| Commission | 12% |

### 4 · Shraddha Meats · `shraddha`

| Field | Value |
| --- | --- |
| Hub | Magarpatta Market |
| Type | meat |
| Description | Cut-to-order fresh meat. Halal and jhatka clearly labelled. Chill chain maintained. |
| Hours | 07:00–21:00 |
| Address | Shop 7, Magarpatta Market, Hadapsar |
| Owner | Shraddha Bhosale · `9000000005` |
| Email | owner@shraddhameats.example |
| OTP | `123456` |
| Fulfilment | **Concierge / platform rider** |
| FSSAI | 11521998000345 |
| PAN | SHRDM2345P |
| Bank | Shraddha Meats · `60098765432100` · HDFC0004567 |
| UPI | `shraddha@hdfcbank` |
| Commission | 15% |

### 5 · Magarpatta Pharmacy · `mg-pharmacy`

| Field | Value |
| --- | --- |
| Hub | Magarpatta |
| Type | pharmacy |
| Description | Registered pharmacist on site. Prescription refills handled with care. |
| Hours | 08:00–23:00 |
| Address | Ground floor, Nyati Millenium, Magarpatta |
| Owner | Dr. Meera Joshi · `9000000006` |
| Email | rx@mgpharma.example |
| OTP | `123456` |
| Fulfilment | **Concierge / platform rider** |
| Drug licence | MH/PUNE/R/2018/00421 |
| PAN | MGPHR7890Q |
| Bank | Magarpatta Pharmacy · `33311122244455` · SBIN0006789 |
| UPI | `mgpharma@sbi` |
| Commission | 10% |

### 6 · Starbucks · Seasons · `starbucks`

| Field | Value |
| --- | --- |
| Hub | Seasons Mall |
| Type | cafe |
| Description | Coffee from the counter to your door in under 20 minutes. |
| Hours | 07:00–23:30 |
| Address | Ground floor, Seasons Mall, Magarpatta |
| Owner | Tata Starbucks · Magarpatta · `9000000007` |
| Email | mgr.seasons@starbucks.example |
| OTP | `123456` |
| Fulfilment | **Self-delivery** · ₹25 fee · vendor sees orders in their dashboard |
| GSTIN | 27SBUKS9999S1Z1 |
| FSSAI | 11521998000567 |
| PAN | SBUCS9999S |
| Bank | Tata Starbucks Pvt Ltd · `90011122233344` · HDFC0000100 |
| UPI | `starbucks@hdfc` |
| Commission | 20% |

### 7 · Gulab Paan Corner · `gulab-paan` *(concierge-only — off-platform)*

| Field | Value |
| --- | --- |
| Hub | Magarpatta Market |
| Type | sweets |
| Description | Legendary paan stand outside the market gate. Walk-in only — our rider picks up for you. |
| Hours | 16:00–23:30 |
| Address | Pavement stall, near Magarpatta Market gate |
| Sign-in | **Not on platform** — no dashboard access, no OTP |
| Fulfilment | **Concierge only** · vendor never notified · rider walks in & pays at the stall |
| Commission | 0% (off-platform pickup) |

### 8 · Magarpatta Mandi · `magarpatta-mandi` *(Wholesale — Fruit / Vegetables)*

| Field | Value |
| --- | --- |
| Hub | Magarpatta |
| Type | grocery |
| Description | Fresh fruits and vegetables straight from Pune mandi. Prices update each morning after the wholesale auction. |
| Hours | 07:00–20:00 |
| Address | Magarpatta City, Hadapsar, Pune |
| Owner | Magarpatta Mandi Owner · `9999900001` |
| **OTP** | `123456` (DEMO_MODE) |
| **isWholesale** | true — visible when admin flips `wholesale_only_mode` on |
| **Min order** | ₹200 |
| Commission | 15% (default) |
| Fulfilment | **Concierge / platform rider** |
| Catalogue | 12 SKUs — onions, potatoes, tomatoes, green chillies, coriander, baby spinach, capsicum, lemons, bananas, apples, watermelon, pomegranate |
| Daily-overrides screen | `/vendor/today` |

### 9 · Magarpatta Daily · `magarpatta-daily` *(Wholesale — Eggs / Meat / Breads)*

| Field | Value |
| --- | --- |
| Hub | Magarpatta |
| Type | grocery |
| Description | Eggs, fresh meat and breads delivered the same day. Halal/jhatka clearly labelled, chill chain maintained. |
| Hours | 07:00–21:00 |
| Address | Magarpatta City, Hadapsar, Pune |
| Owner | Magarpatta Daily Owner · `9999900002` |
| **OTP** | `123456` (DEMO_MODE) |
| **isWholesale** | true — visible when admin flips `wholesale_only_mode` on |
| **Min order** | ₹250 |
| Commission | 15% (default) |
| Fulfilment | **Concierge / platform rider** |
| Catalogue | 9 SKUs — brown eggs (tray of 30), white eggs (half-dozen), chicken breast, chicken thigh, chicken keema, mutton curry-cut, whole-wheat loaf, pav, multigrain loaf |
| Daily-overrides screen | `/vendor/today` |

### 10 · Demo Dosa House · `dosa-house` *(PENDING — for admin approval testing)*

| Field | Value |
| --- | --- |
| Hub | Magarpatta Market |
| Type | restaurant |
| Description | South Indian, fresh daily. Awaiting approval. |
| Hours | 07:00–22:00 |
| Address | Shop 12, Magarpatta Market |
| Owner | Suresh Nair · `9000000003` |
| Email | suresh@dosahouse.example |
| OTP | `123456` (only after admin approval) |
| FSSAI | 11521998000789 |
| PAN | DOSAP1234Q |
| Bank | Demo Dosa House · `77777788889999` · SBIN0005432 |
| UPI | `dosa@okaxis` |
| Commission | 15% |

### Quick lookup

| Shop | Phone | Hub | Mode |
| --- | --- | --- | --- |
| Kalika Sweets | 9000000001 | Magarpatta Market | Concierge / rider |
| Baker's Basket | 9000000002 | Seasons Mall | **Self-delivery** |
| Demo Dosa House (PENDING) | 9000000003 | Magarpatta Market | — |
| Destination Centre | 9000000004 | Destination Centre | Concierge / rider |
| Shraddha Meats | 9000000005 | Magarpatta Market | Concierge / rider |
| Magarpatta Pharmacy | 9000000006 | Magarpatta | Concierge / rider |
| Starbucks · Seasons | 9000000007 | Seasons Mall | **Self-delivery** |
| Gulab Paan Corner | — | Magarpatta Market | Concierge only · off platform |
| **Magarpatta Mandi** *(wholesale)* | **9999900001** | Magarpatta | Concierge / rider |
| **Magarpatta Daily** *(wholesale)* | **9999900002** | Magarpatta | Concierge / rider |

OTP for all signed-in vendors is `123456` while `DEMO_MODE` in `lib/otp.ts` is on. Flip the demo flag before launch — see `MEMORY.md` → `project_magarpatta_demo_otp.md`.

The two wholesale vendors above are the only ones visible to customers when `wholesale_only_mode` is on (admin → `/admin/settings`). Flip it off to show the full retail catalogue.

---

## Rider logins (approved)

Signin at `/rider/signin`. OTP `123456` on demo phones, no SMS.

| Name | Phone | OTP | Vehicle | Per drop |
| --- | --- | --- | --- | --- |
| Akash M. | 8888888801 | `123456` | Motorcycle · MH12 AM 2211 | ₹30 |
| Priya S. | 8888888802 | `123456` | Scooter · MH12 PS 1040 | ₹30 |
| Rohan D. | 8888888803 | `123456` | Motorcycle · MH12 RD 8820 | ₹30 |
| Neha K. | 8888888804 | `123456` | Bicycle | ₹30 |

### Pending rider — for admin approval testing

| Name | Phone | OTP |
| --- | --- | --- |
| Kiran J. | 8888888805 | `123456` (after admin approval) |

---

## Admin login

| Name | Phone | OTP | Role |
| --- | --- | --- | --- |
| Magarpatta Ops | 9999999999 | `123456` | SUPER_ADMIN |

The admin overview gets a new **Activity** tab (`/admin/activity`) — a cross-portal feed of every meaningful action by vendors, riders, curators, and admins. Filter by role or by free-text actor name.

---

## Curator login

The curator sits between the vendor and the admin in the bulk menu-import flow. The vendor uploads a printed-menu photo → Tesseract OCRs it → vendor reviews → submits as a `MenuImportJob` (status `PENDING_CURATOR`) → curator opens the job, sees the original photo side-by-side with the parsed items, fixes anything OCR got wrong, then forwards to admin (each item becomes a `PRODUCT/CREATE` PendingChange in the existing admin queue).

| Name | Phone | OTP |
| --- | --- | --- |
| Magarpatta Curator | 7000000001 | `123456` |

The curator portal lives at `/curator`. Sign in once and the row auto-provisions in the `Curator` table (demo bootstrap — remove before launch).

Curator can:
- Edit any field on any parsed row (name, MRP, price, unit, veg flag, MRP-locked flag)
- Add missing items the OCR dropped
- Delete OCR noise rows
- Reject the whole job with a note (vendor sees the reason)

Single-item vendor edits (Add item / Edit item from the menu page) **do not** route through the curator — they continue going straight to `PendingChange` for admin review. Only bulk imports (photo / QR / paste) go through the curator queue.

---

## Helpdesk login

The helpdesk sits between the customer and the admin for support-ticket triage. A customer files a complaint at `/support` (any of: wrong item, missing item, quality, late delivery, rider behaviour, payment, refund, account, other). The ticket lands in the helpdesk queue at `/helpdesk` for the staff agent to acknowledge, ask follow-ups, and resolve. Admin oversees the queue read-only at `/admin/support` — admin cannot reply or change status.

| Name | Phone | OTP |
| --- | --- | --- |
| Magarpatta City Helpdesk | 7000000003 | `123456` |
| Amanora Helpdesk | 7000000004 | `123456` |

The helpdesk portal lives at `/helpdesk`. Sign in once and the row auto-provisions in the `SupportAgent` table (demo bootstrap — remove before launch). The portal has two tabs: **Queue** (open / in-review / awaiting-customer) and **Resolved**.

Helpdesk can:
- Reply to any ticket — auto-flips status to AWAITING_CUSTOMER and auto-claims the ticket
- "Reply & resolve" — sends the reply and stamps `resolvedAt` in one shot
- Change status (Open · In review · Awaiting customer · Resolved · Closed)
- Change priority (Low · Normal · High · Urgent)
- Re-categorise (the customer's chosen category may not match what the issue actually is)

Customer behaviour — adding a reply on a RESOLVED ticket re-opens it to IN_REVIEW. CLOSED is final; further replies are blocked on both sides.

Ticket lifecycle: `OPEN` (just filed) → `IN_REVIEW` (helpdesk touched) → `AWAITING_CUSTOMER` (helpdesk asked something) → `RESOLVED` (helpdesk closed the loop) → `CLOSED` (final).

Activity log: ticket events are recorded with `actorRole = HELPDESK` (or `CUSTOMER` for the file/reply events) — visible in the admin activity feed.

---

## Customer

Use any Indian 10-digit mobile at `/signin` or `/signup`. While `DEMO_MODE=true`, every phone accepts OTP `123456` (no SMS sent). Once flipped off, real OTPs are sent via Fast2SMS.

`/signup` is a 3-step flow: name + phone → OTP verify → society + building + flat. The signup verify upserts the `User` row, so a "new" phone signs in cleanly the first time without a separate flow.

---

## Fulfilment summary

Two flows, decided at checkout:

```
every vendor in the cart supports self-delivery   →  VENDOR_SELF
                                                     (vendor sees orders in their dashboard;
                                                      vendor's own staff delivers)
else                                              →  PLATFORM_RIDER (concierge)
                                                     (vendor NOT notified; our rider walks
                                                      into the shop, places the order at
                                                      the counter, pays from the float,
                                                      brings it to the customer)
```

**Self-delivery is unconditional.** If a vendor has `supportsSelfDelivery=true`, every order from them goes to their dashboard regardless of how busy their team is. There is no automatic fallback to platform rider.

## Hub mapping (for cart rule testing)

| Hub | Vendors |
| --- | --- |
| Magarpatta Market | Kalika Sweets, Shraddha Meats, Gulab Paan Corner, Demo Dosa House (pending) |
| Seasons Mall | The Baker's Basket, Starbucks |
| Destination Centre | Destination Centre |
| Magarpatta | Magarpatta Pharmacy |

A cart can mix multiple vendors *within* one hub. Crossing hubs is blocked by the cart drawer with a switch dialog.

---

## Amanora Park Town — demo accounts

Different phone ranges from Magarpatta so a single human can sign in to either instance without browser-cookie / session collisions. OTP is `123456` on every Amanora demo phone while `DEMO_MODE=true`.

### Vendors (`/vendor/signin` on https://amanora-go.vercel.app)

| Shop | Phone | Password | Hub | Mode | Type |
| --- | --- | --- | --- | --- | --- |
| Theobroma Patisserie | 9100000001 | `theo123` | Amanora Mall | **Self-delivery** ₹25 | bakery |
| Trattoria Italiano | 9100000002 | `trat123` | Amanora Town Centre | Concierge / rider | restaurant |
| Cafe Bloom | 9100000003 | `bloom123` | Amanora Mall | **Self-delivery** ₹30 | cafe |
| MedPlus · Amanora | 9100000004 | `med123` | Amanora Mall | Concierge / rider | pharmacy |
| Star Bazaar · Amanora | 9100000005 | `star123` | Amanora Town Centre | Concierge / rider | grocery |
| Fresh Cuts Meat Co. | 9100000007 | `cuts123` | Amanora Main Road | Concierge / rider | meat |
| The Burger Co. (PENDING) | 9100000006 | `burger123` | Amanora Main Road | — | restaurant |
| Paan Republic | — | — | Amanora Town Centre | Concierge only · off platform | sweets |

Total: 6 approved + 1 pending + 1 concierge-only = 8 vendors. ~31 products across the bunch, image-tagged from `/products/*` so they render with thumbnails.

### Riders (`/rider/signin` on https://amanora-go.vercel.app)

OTP `123456`, no password. Range `8888889001`..`05`.

| Name | Phone | Vehicle | Plate | Per drop |
| --- | --- | --- | --- | --- |
| Suraj P. | 8888889001 | Motorcycle | MH14 SP 7711 | ₹30 |
| Aarti V. | 8888889002 | Scooter | MH14 AV 4422 | ₹30 |
| Rahul N. | 8888889003 | Motorcycle | MH14 RN 9001 | ₹30 |
| Pooja M. | 8888889004 | Bicycle | — | ₹30 |
| Sandeep K. (PENDING) | 8888889005 | Scooter | MH14 SK 0808 | (after admin approval) |

### Admin (`/admin/signin`)

| Name | Phone | Password | Role |
| --- | --- | --- | --- |
| Amanora Ops | 9999999888 | `admin123` | SUPER_ADMIN |

### Curator (`/curator/signin`)

| Name | Phone | OTP |
| --- | --- | --- |
| Amanora Curator | 7000000002 | `123456` |

### Customer addresses to test with

The Amanora directory has 11 clusters, ~60 towers. Useful pickers for signup / address-add:

| Society | Building | Flat |
| --- | --- | --- |
| Aspire Towers | Tower 1 | 101 |
| Gateway Towers | Tower T-99 | 1804 |
| Future Towers | Tower 51 | 1203 |
| Trendy Towers | Tower T-31 | 805 |
| Gardenia Society | Block A | 201 |

---

## Re-seeding

### Magarpatta

```powershell
cd C:\projects\magarpatta-delivery\apps\web
npx vercel env pull .env --environment=production
npx prisma db push                       # one-time, if schema changed
npx -y dotenv-cli -e .env -- npx tsx prisma/seed-dashboards.ts
```

### Amanora

```powershell
cd C:\projects\magarpatta-delivery\apps\web
$env:DATABASE_URL = "<paste Amanora Neon connection string>"
npx prisma db push                       # one-time, if schema changed
npx tsx prisma/seed-amanora.ts
```

Seeds are idempotent — safe to run any number of times. They upsert vendors by slug, admins by phone, riders by phone, and curators by phone.

For wiring product images use `prisma/seed-local-images.ts` (existing items) or `prisma/seed-images-new.ts` (Baker's Basket + Gulab Paan Corner items added in Phase 2). Amanora's `seed-amanora.ts` already wires `imageUrl` to local `/products/*` paths inline, so no separate image script is needed.

> **Build-time schema sync.** `apps/web/package.json` currently runs `prisma db push --accept-data-loss --skip-generate` as part of the build script so every Vercel deploy syncs the schema automatically. This is fine for the demo phase but unsafe once real customer data starts flowing — switch back to plain `prisma generate && next build` and use `prisma migrate deploy` before launch.

## Legal / compliance notes

- **MRP rule**: regulated goods (medicines, packaged staples) sell at MRP only. `isRegulated=true` on a product locks `priceInr = mrpInr`.
- **Non-regulated +₹1 markup**: prepared food, loose produce, fresh meat, bakery — allowed under Legal Metrology Rules, 2011.
- **MTDCC MoU**: non-negotiable launch prerequisite. Not in place yet for production.
- **FSSAI + Drug licence**: every food / pharmacy vendor must supply their licence number at registration; admin verifies over a call before approval.
- **OTP data**: `OtpCode` rows retain codeHash (sha256) + attempts for audit. Plaintext codes never stored. Codes expire after 5 minutes regardless of consumption.
