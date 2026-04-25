# Magarpatta Go · Access & URLs

> Demo credentials. Rotate before real launch. This file is committed intentionally for the Phase‑1/Phase‑2 demo — treat it like a README, not a secrets vault.

## Live URLs

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

### Local dev

```powershell
cd C:\projects\magarpatta-delivery
pnpm dev
```
Then http://localhost:3000 for the customer site; same `/vendor`, `/rider`, `/admin` paths work.

---

## Auth · two systems running side by side

| Role | System | Notes |
| --- | --- | --- |
| Customer | **Firebase phone auth** | Original flow restored. Test phone `8328945939` returns OTP `123456` (configured in Firebase console). All other phones get a real SMS via Firebase. |
| Vendor / Rider / Admin | **Server-owned OTP (Fast2SMS)** | Demo seeded phones (listed below) accept OTP `123456` without SMS. Any other phone receives a real SMS via Fast2SMS. |

### Server OTP details (vendor / rider / admin)

| Aspect | Value |
| --- | --- |
| Purpose codes | `VENDOR_SIGNIN` · `VENDOR_REGISTER` · `RIDER_SIGNIN` · `RIDER_REGISTER` · `ADMIN_SIGNIN` |
| OTP length | 6 digits |
| Expiry | 5 minutes from send |
| Resend cooldown | 30 seconds per `(phone, purpose)` |
| Max wrong attempts | 5 — then the code is invalidated and you must resend |
| Single-use | Consumed on successful verify; `consumedAt` stamped |
| SMS provider | Fast2SMS — `route=otp` |
| Demo OTP | **`123456`** — accepted only for the seeded demo phones below |
| Storage | sha256 hash only; plaintext never persisted |

### API surface

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/otp/send` | Vendor / rider / admin · body `{ phone, purpose }` |
| `POST /api/vendor/session` | Vendor verify → sets `mg_vendor_session` |
| `POST /api/rider/session` | Rider verify → sets `mg_rider_session` (approved only) |
| `POST /api/admin/session` | Admin verify → sets `mg_admin_session` |
| `POST /api/vendor/register` | Creates PENDING vendor after OTP verify |
| `POST /api/rider/register` | Creates PENDING rider after OTP verify |
| `POST /api/auth/firebase-session` | Customer · exchanges Firebase ID token for `mg_session` cookie |

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

### 8 · Demo Dosa House · `dosa-house` *(PENDING — for admin approval testing)*

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

---

## Customer

Use any Indian 10-digit mobile at `/signin` or `/signup`. Firebase texts a real 6-digit code (5-min expiry).

**Test phone shortcut**: `8328945939` always receives OTP `123456` (configured in Firebase Auth console). Use this for demos so no real SMS is sent.

`/signup` is a 3-step flow: name + phone → Firebase OTP verify → society + building + flat.

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

## Re-seeding

```powershell
cd C:\projects\magarpatta-delivery\apps\web
npx vercel env pull .env --environment=production
npx prisma db push                       # one-time, if schema changed
npx -y dotenv-cli -e .env -- npx tsx prisma/seed-dashboards.ts
```

Seeds are idempotent — safe to run any number of times. They upsert vendors by slug, admins by phone, and riders by phone.

For wiring product images use `prisma/seed-local-images.ts` (existing items) or `prisma/seed-images-new.ts` (Baker's Basket + Gulab Paan Corner items added in Phase 2).

## Legal / compliance notes

- **MRP rule**: regulated goods (medicines, packaged staples) sell at MRP only. `isRegulated=true` on a product locks `priceInr = mrpInr`.
- **Non-regulated +₹1 markup**: prepared food, loose produce, fresh meat, bakery — allowed under Legal Metrology Rules, 2011.
- **MTDCC MoU**: non-negotiable launch prerequisite. Not in place yet for production.
- **FSSAI + Drug licence**: every food / pharmacy vendor must supply their licence number at registration; admin verifies over a call before approval.
- **OTP data**: `OtpCode` rows retain codeHash (sha256) + attempts for audit. Plaintext codes never stored. Codes expire after 5 minutes regardless of consumption.
