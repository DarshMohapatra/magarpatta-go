# Backend Architecture — Phase 1

## TL;DR
The backend **lives inside the Next.js app** right now. There is no separate "server" project yet.

Every file under `apps/web/app/api/**/route.ts` is a backend HTTP endpoint. Next.js compiles them as serverless functions and Vercel deploys them automatically.

## Current API surface (Phase 1 MVP)

| Endpoint | Method | Purpose | Status |
|---|---|---|---|
| `/api/auth/send-otp` | POST | Generates a 6-digit OTP for a phone number. Dev mode logs the code to server console and returns it in `devHint`. | Mock — swap to MSG91 when keys arrive |
| `/api/auth/verify-otp` | POST | Checks OTP, sets a `mg_session` httpOnly cookie on success. | Working (cookie-based session) |
| `/api/auth/session` | GET / DELETE | Returns current session info / logs out. | Working |
| `/api/geofence/check` | POST | Checks whether a tower name OR `{lat, lng}` is inside Magarpatta City. | Working (approx polygon) |
| `/api/waitlist` | POST / GET | Accepts waitlist signups. Currently in-memory (lost on restart). | Mock — swap to Neon |

## Why "backend inside Next.js"?

For a Phase 1 MVP with 4 riders and sub-200 orders/day, a separate NestJS service is overhead. Next.js API routes give you:

- **Single deploy** — push once, web + API go live together.
- **Shared types** — `lib/towers.ts` is importable from both UI and API.
- **Edge runtime available** — heavy routes (geofence pre-check) can run on Vercel Edge later.
- **Zero CORS** — same origin as the frontend.

When we hit Phase 2 (see `ROADMAP.md`), we **strangler-extract** hot paths into a NestJS service:
- Dispatch algorithm
- Order state machine
- Razorpay webhook processor

## What needs wiring next

### 1. Neon Postgres (replaces in-memory stores)
- Add Prisma to `packages/db`.
- Migrate: `users`, `sessions`, `waitlist`, `buildings` (tower dictionary), `orders`, `products`, `vendors`.
- Connection string in `apps/web/.env.local` as `DATABASE_URL`.

### 2. MSG91 real SMS
Replace the `console.log` in `send-otp/route.ts`:

```ts
await fetch('https://control.msg91.com/api/v5/flow/', {
  method: 'POST',
  headers: {
    'authkey': process.env.MSG91_AUTH_KEY!,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    template_id: process.env.MSG91_TEMPLATE_ID,
    short_url: '1',
    recipients: [{ mobiles: `91${phone}`, otp: code }],
  }),
});
```

### 3. Razorpay
- `/api/orders` to create a Razorpay order.
- `/api/payments/webhook` to verify signature and update order state.
- Dashboard test keys work in dev; live keys after KYC.

### 4. PostGIS geofence
Replace the hardcoded polygon in `/api/geofence/check/route.ts` with:

```ts
const inside = await prisma.$queryRaw`
  SELECT ST_Contains(
    (SELECT geom FROM geofences WHERE name = 'magarpatta_core'),
    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
  ) AS inside
`;
```

Requires `CREATE EXTENSION postgis;` on Neon — you already ran this in Step 2 of Track A.

## Environment variables

Create `apps/web/.env.local` (don't commit):

```
DATABASE_URL=postgresql://...pooler.../neondb?sslmode=require
MSG91_AUTH_KEY=
MSG91_TEMPLATE_ID=
MSG91_SENDER_ID=MGPTGO
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
MAPPLS_REST_KEY=
MAPPLS_MAP_SDK_KEY=
SESSION_SECRET=generate-a-random-32-char-string
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Security notes

- Sessions are currently plain base64 JSON in a cookie. **Not production-grade** — swap to a signed JWT or a server-side session table before launch.
- In-memory OTP store is wiped on server restart and doesn't scale across serverless instances. Move to Redis (Upstash has a free tier) or a Postgres table before public beta.
- Rate-limit `/api/auth/send-otp` before launch (3 requests/hour/phone).
