# Magarpatta Go · Access & URLs

> Demo credentials. Rotate before real launch. This file is committed intentionally for the Phase‑1/Phase‑2 demo — treat it like a README, not a secrets vault.

## Live URLs

| Role | URL |
| --- | --- |
| Customer app | https://web-eta-ebon-80.vercel.app |
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

## Vendor logins (all approved, active)

| Shop | Hub | Delivery mode | Owner phone | Password |
| --- | --- | --- | --- | --- |
| Kalika Sweets | Magarpatta Market | **Self-delivery** (₹20 fee) | 9000000001 | `kalika123` |
| The Baker's Basket | Seasons Mall | Platform rider | 9000000002 | `bakers123` |
| Destination Centre | Destination Centre | Platform rider | 9000000004 | `dcmart123` |
| Shraddha Meats | Magarpatta Market | Platform rider | 9000000005 | `shraddha123` |
| Magarpatta Pharmacy | Magarpatta | Platform rider | 9000000006 | `mgpharma123` |
| Starbucks · Seasons | Seasons Mall | **Self-delivery** (₹25 fee) | 9000000007 | `sbuxmg123` |

### Still pending — use to test the admin approval queue

| Shop | Hub | Owner phone | Password |
| --- | --- | --- | --- |
| Demo Dosa House | Magarpatta Market | 9000000003 | `dosa123` |

## Rider logins (approved, no password — phone-only)

| Name | Phone | Vehicle | Per drop |
| --- | --- | --- | --- |
| Akash M. | 8888888801 | Motorcycle · MH12 AM 2211 | ₹30 |
| Priya S. | 8888888802 | Scooter · MH12 PS 1040 | ₹30 |
| Rohan D. | 8888888803 | Motorcycle · MH12 RD 8820 | ₹30 |
| Neha K. | 8888888804 | Bicycle | ₹30 |

### Pending rider — for admin approval testing

| Name | Phone |
| --- | --- |
| Kiran J. | 8888888805 |

## Admin login

| Name | Phone | Password | Role |
| --- | --- | --- | --- |
| Magarpatta Ops | 9999999999 | `admin123` | SUPER_ADMIN |

## Customer

No seeded customer — use your own 10-digit Indian mobile at the sign-in page, get the Firebase OTP, done.

## Hub mapping (for cart rule testing)

| Hub | Vendors in this hub |
| --- | --- |
| Magarpatta Market | Kalika Sweets, Shraddha Meats, Demo Dosa House |
| Seasons Mall | The Baker's Basket, Starbucks |
| Destination Centre | Destination Centre |
| Magarpatta | Magarpatta Pharmacy |

A cart can mix multiple vendors *within* one hub (e.g. Baker's + Starbucks). Crossing hubs is blocked at the cart.

## Re-seeding

```powershell
cd C:\projects\magarpatta-delivery\apps\web
npx vercel env pull .env --environment=production
npx prisma db push                       # one-time, if schema changed
npx -y dotenv-cli -e .env -- npx tsx prisma/seed-dashboards.ts
```

The seed is idempotent — safe to run any number of times. It upserts vendors by slug, admins by phone, and riders by phone.

## Legal / compliance notes

- **MRP rule**: regulated goods (medicines, packaged staples) sell at MRP only. `isRegulated=true` on a product locks `priceInr = mrpInr`.
- **Non-regulated +₹1 markup**: prepared food, loose produce, fresh meat, bakery — allowed under Legal Metrology Rules, 2011.
- **MTDCC MoU**: non-negotiable launch prerequisite. Not in place yet for production.
- **FSSAI + Drug licence**: every food / pharmacy vendor must supply their licence number at registration; admin verifies over a call before approval.
