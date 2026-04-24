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

## Auth — one OTP system across every role

All four roles now use the same unified phone-OTP flow. No passwords, no Firebase client. Fast2SMS backs the production SMS delivery (`FAST2SMS_API_KEY` is set on Vercel).

| Aspect | Value |
| --- | --- |
| Purpose codes | `CUSTOMER_SIGNIN` · `VENDOR_SIGNIN` · `VENDOR_REGISTER` · `RIDER_SIGNIN` · `RIDER_REGISTER` · `ADMIN_SIGNIN` |
| OTP length | 6 digits |
| Expiry | 5 minutes from send |
| Resend cooldown | 30 seconds per `(phone, purpose)` |
| Max wrong attempts | 5 — then the code is invalidated and you must resend |
| Single-use | Consumed on successful verify; `consumedAt` stamped |
| SMS provider | Fast2SMS — `route=otp` (OTP template) |
| Demo OTP | **`123456`** — accepted only for the seeded demo phones below |

**Every OTP send logs to Vercel server logs**, so during testing you can grab any code for any real phone by tailing logs.

### Demo phones (always accept `123456`, no SMS sent)

Every phone listed in the tables below is a "demo phone" — OTP is hardcoded to `123456` and no Fast2SMS charge is incurred. Any other phone gets a real SMS.

### API surface

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/otp/send` | Shared — body `{ phone, purpose }`, returns `{ demoOtp?, smsSent }` |
| `POST /api/auth/otp/signin` | Customer verify → upserts `User`, sets `mg_session` |
| `POST /api/vendor/session` | Vendor verify → sets `mg_vendor_session` |
| `POST /api/rider/session` | Rider verify → sets `mg_rider_session` (approved only) |
| `POST /api/admin/session` | Admin verify → sets `mg_admin_session` |
| `POST /api/vendor/register` | Creates PENDING vendor after OTP verify (phone ownership proven) |
| `POST /api/rider/register` | Creates PENDING rider after OTP verify |

---

## Vendor logins (all approved, active)

Signin is OTP-only. Use OTP `123456` on the demo phone.

| Shop | Hub | Delivery mode | Owner phone | OTP |
| --- | --- | --- | --- | --- |
| Kalika Sweets | Magarpatta Market | Platform rider | 9000000001 | `123456` |
| The Baker's Basket | Seasons Mall | **Self-delivery** (₹20 fee) | 9000000002 | `123456` |
| Destination Centre | Destination Centre | Platform rider | 9000000004 | `123456` |
| Shraddha Meats | Magarpatta Market | Platform rider | 9000000005 | `123456` |
| Magarpatta Pharmacy | Magarpatta | Platform rider | 9000000006 | `123456` |
| Starbucks · Seasons | Seasons Mall | **Self-delivery** (₹25 fee) | 9000000007 | `123456` |

### Still pending — use to test the admin approval queue

| Shop | Hub | Owner phone | OTP |
| --- | --- | --- | --- |
| Demo Dosa House | Magarpatta Market | 9000000003 | `123456` (after admin approval) |

> Note: pending vendors can&apos;t sign in until an admin flips them to APPROVED.

## Rider logins (approved)

Signin is OTP-only. Use OTP `123456` on the demo phone.

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

## Admin login

| Name | Phone | OTP | Role |
| --- | --- | --- | --- |
| Magarpatta Ops | 9999999999 | `123456` | SUPER_ADMIN |

## Customer

No seeded customer — use your own 10-digit Indian mobile at `/signin` or `/signup`. Fast2SMS texts you a real 6-digit code (check your SMS inbox, valid for 5 minutes). On `/signup` you also pick society + building + flat after OTP verify.

## Hub mapping (for cart rule testing)

| Hub | Vendors in this hub |
| --- | --- |
| Magarpatta Market | Kalika Sweets, Shraddha Meats, Demo Dosa House |
| Seasons Mall | The Baker's Basket, Starbucks |
| Destination Centre | Destination Centre |
| Magarpatta | Magarpatta Pharmacy |

A cart can mix multiple vendors *within* one hub (e.g. Baker's + Starbucks). Crossing hubs is blocked at the cart.

---

## Re-seeding

```powershell
cd C:\projects\magarpatta-delivery\apps\web
npx vercel env pull .env --environment=production
npx prisma db push                       # one-time, if schema changed
npx -y dotenv-cli -e .env -- npx tsx prisma/seed-dashboards.ts
```

The seed is idempotent — safe to run any number of times. It upserts vendors by slug, admins by phone, and riders by phone. Legacy password columns are retained on the schema for audit only; new accounts store `null` for those.

## Legal / compliance notes

- **MRP rule**: regulated goods (medicines, packaged staples) sell at MRP only. `isRegulated=true` on a product locks `priceInr = mrpInr`.
- **Non-regulated +₹1 markup**: prepared food, loose produce, fresh meat, bakery — allowed under Legal Metrology Rules, 2011.
- **MTDCC MoU**: non-negotiable launch prerequisite. Not in place yet for production.
- **FSSAI + Drug licence**: every food / pharmacy vendor must supply their licence number at registration; admin verifies over a call before approval.
- **OTP data**: `OtpCode` rows retain codeHash (sha256) + attempts for audit. Plaintext codes never stored. Codes expire after 5 minutes regardless of consumption.
