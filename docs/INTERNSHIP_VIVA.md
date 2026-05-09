# Magarpatta Go · Internship viva prep
_CSE internship project — technical Q&A, architecture justification, and defence script._

> Scope: this doc is for the academic panel / mentor / HR interview. It assumes you're a final-year CSE student presenting this as an internship deliverable. Every answer is phrased the way a CSE student with genuine understanding would phrase it — confident, grounded in CS vocabulary, not salesy.

---

## 1. The one-paragraph project summary (memorise this)

> Magarpatta Go is a full-stack hyper-local food-and-essentials delivery platform scoped to a single township — Magarpatta City, Pune. I built a consumer web app, a rider web app, a backend API layer, and a Postgres schema, deployed serverlessly on Vercel. It covers the full order lifecycle: authentication, catalogue browse, cart with single-vendor enforcement, stepwise checkout with coupon + tip, live order tracking with a bike-rider animation, and OTP-verified delivery. Built over three weeks using Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Prisma ORM with Neon Postgres, Firebase Phone Auth, and Zustand for client state.

---

## 2. The "why" questions

**Q: Why did you choose this problem?**
> Food-delivery apps already exist, but none of them solve the _last-mile inside a township_. Living in Magarpatta, I noticed Zomato/Swiggy ETAs drift to 45+ minutes at peak because their riders come from outside the gate. The business opportunity is real, but for me as a CSE student, the technical interest was higher — it's a microcosm of a real e-commerce stack: auth, multi-tenant catalogue, stateful cart, transactional orders, real-time status, geofencing, OTP verification. Every major web-engineering concept shows up in one project.

**Q: Is this a theoretical project or did you actually build it?**
> Fully built and deployed. Live URL: `web-eta-ebon-80.vercel.app`. Source on GitHub. The schema has 14 tables on Neon Postgres, I've written ~15 API routes, 20+ React components, and the git history shows 12 commits across three weeks of iteration.

**Q: Was this individual or team?**
> _[Answer truthfully. Suggested phrasing if individual:]_ Individual project. I owned the full stack — schema design, API implementation, frontend, UI/UX, deployment, and the iteration loop based on feedback from residents in my society.

**Q: How did you scope the project?**
> I wrote a feature-gap document (`docs/FEATURES_VS_BIG_PLAYERS.md`) comparing what Zomato, Swiggy, and Blinkit have — across 12 dimensions like discovery, checkout, live tracking, post-order, compliance. Features I marked ✅ I built, 🚧 I started, ❌ I deferred. Scope discipline was the hardest part — I had to resist building a loyalty program when the MVP didn't have payments yet.

---

## 3. Tech stack justification (they will ask for each choice)

### 3a. Frontend

**Q: Why Next.js 15 and not plain React?**
> Four reasons.
> 1. **Server components** — data fetching happens on the server, so the catalogue page isn't a spinner-then-render, it's HTML with data. Better Core Web Vitals, better SEO.
> 2. **File-system routing** — `app/orders/[id]/page.tsx` is the route; no manual `react-router-dom` config.
> 3. **Built-in API routes** — I don't need a separate Express server for the backend.
> 4. **First-class Vercel deployment** — `git push` → live in 90 seconds.
>
> Plain React (with Vite or CRA) would mean I build my own SSR, routing, bundling, API server. Next.js bundles that work.

**Q: App Router vs Pages Router?**
> App Router (Next 13+). It's the current recommended path from Vercel. Supports React Server Components natively, better nested layouts, built-in loading/error boundaries, streamed rendering. Pages Router is legacy — perfectly functional, but new projects should start on App Router.

**Q: Why TypeScript and not JavaScript?**
> Compile-time type safety on a 20-file codebase catches 10+ bugs before I ever open the browser. Prisma generates typed database queries — if I rename a column, TypeScript tells me everywhere that broke. The only cost is the compile step, and `tsc --noEmit` runs in 4 seconds.

**Q: Why Tailwind CSS over styled-components or plain CSS modules?**
> Three reasons. (1) No context-switching between JSX and a .css file. (2) Design tokens live in `@theme` in globals.css — one source of truth for colours, fonts, spacings. (3) Unused CSS is automatically purged by Tailwind's JIT compiler, so the final CSS bundle is ~18 KB gzipped. For a project where I'm iterating on UI every 10 minutes, Tailwind's velocity is unmatched.

**Q: How do you manage client state?**
> Two layers. Server-side data (session, orders, catalogue) comes via React Server Components — no client fetching. Genuinely client-local state (cart, drawer open/closed, coupon input) lives in Zustand, persisted to `localStorage` via Zustand's `persist` middleware. I picked Zustand over Redux because it's 1.5 KB, no boilerplate, and supports middleware composition.

### 3b. Backend

**Q: Why Prisma ORM?**
> Raw SQL is error-prone in TypeScript because query results are `unknown`. Prisma gives me typed query results derived from the schema. Writing `prisma.order.findMany({ where: { userId: user.id }, include: { items: true } })` is compile-checked — if `items` isn't a relation, TypeScript errors at build time. Prisma Client is auto-generated from `schema.prisma`, so the type system and the database stay in sync by construction.

**Q: Why Neon Postgres over MongoDB / Firebase Firestore / MySQL?**
> Relational model fits the domain. Orders have users, users have addresses, orders have items, items reference products. That's a foreign-key graph — SQL is the natural representation.
> - **Over MongoDB**: I need JOINs for "orders with their items and vendor name" in a single query. Mongo would force denormalisation or aggregation pipelines; Postgres does it with `JOIN`.
> - **Over Firestore**: Firestore has no schema, no JOINs, and writes-per-second costs money. Neon is serverless Postgres — sleeps when idle, wakes instantly, and the free tier is generous.
> - **Over MySQL**: Postgres has better JSON support, proper array columns (my `tags String[]` column), and richer constraint options. Plus Neon's branching feature lets me create a schema-test branch without touching prod.

**Q: Why Firebase Phone Auth instead of rolling your own OTP?**
> Rolling my own means I need an SMS provider (MSG91/Fast2SMS), storage for pending OTPs, rate-limiting, expiry, retry logic, and international format parsing. Firebase gives me all of that as a drop-in SDK plus a reCAPTCHA v3 widget for bot prevention. One dependency vs building a mini auth system. Trade-off: I don't control the UX 100% and the Spark (free) plan has test-phone-only limitations.

**Q: Why Vercel and not AWS / Heroku / self-hosted?**
> Vercel is built by the Next.js team — the framework and the platform are co-designed. Deployment is `git push origin main`. Serverless functions (API routes) auto-scale, I don't manage Kubernetes. Free tier for hobby/internship projects. For a bigger team I'd re-evaluate — AWS gives more control at the cost of YAML wrangling — but Vercel is the right choice for this project's stage.

---

## 4. Architecture questions

**Q: Draw the high-level architecture.**
> Client (browser) → Vercel Edge / CDN → Next.js serverless function (API route or Server Component) → Prisma Client → Neon Postgres (pooled). Firebase Auth is a sibling service called from the client for OTP, which then posts the verified phone to my `/api/auth/firebase-session` route. No separate backend server — Next.js fuses frontend and backend in one runtime.

**Q: What's the request lifecycle for "customer loads /menu"?**
> 1. Browser hits `/menu` via client-side routing (or direct URL).
> 2. Vercel routes to the `app/menu/page.tsx` Server Component.
> 3. Server reads session cookie, queries Postgres for products + categories via Prisma.
> 4. Returns rendered HTML + data to client.
> 5. React hydrates on the client — interactive without re-fetching.

**Q: How do client and server communicate?**
> Three mechanisms: (1) Server Components fetch data directly — no HTTP call, they compile to server-side calls. (2) Client Components call `/api/*` routes via `fetch`. (3) Server Actions (which I didn't use — chose explicit API routes for clarity).

**Q: How does session management work?**
> After OTP verification, I issue a base64url-encoded JSON cookie (`mg_session`) containing `{ phone }`. The cookie is `httpOnly` (not readable by JS, XSS-safe), `secure` (HTTPS only), `sameSite=lax` (CSRF-resistant), with a 30-day max-age. Every server request reads the cookie in `lib/session.ts` via `cookies()` from Next's headers API. I wrapped this in `React.cache()` so multiple server components in the same request share one DB round-trip for the user lookup.

---

## 5. Database design Q&A

**Q: Walk me through your ER diagram.**
> Core tables:
> - `User` — id, phone (unique), name, firebaseUid.
> - `UserAddress` — belongs to User; society + building + flat.
> - `Society` → `Building` (one-to-many); verified directory.
> - `Vendor` → `Product` (one-to-many); Product also has a `Category`.
> - `Order` → `OrderItem` (one-to-many); Order belongs to User.
> - `Coupon` — standalone, referenced by code on Order.
> - `WaitlistEntry` — for pre-launch captures.
>
> Relationships use foreign keys with `onDelete: Cascade` for owned records (UserAddress, OrderItem) and `onDelete: Restrict` for referenced records (Product on OrderItem — we can't delete a product that's in a placed order).

**Q: Is your schema normalised?**
> Third normal form for most tables. One deliberate denormalisation: `OrderItem` duplicates product fields (`name`, `priceInr`, `mrpInr`, `imageUrl`) at order time. This is intentional — an order is a historical snapshot. If the product's price changes next week, the customer's past order should still show what they were charged at the time. Normalising this (just keeping productId and joining) would let price-changes rewrite history.

**Q: What indexes did you add?**
> Prisma auto-creates indexes on primary keys and unique constraints. I added: `@@index([phone])` on User (login lookup), `@@index([userId])` + `@@index([placedAt])` on Order (orders page query), `@@index([vendorId])` + `@@index([inStock])` on Product (catalogue filter), and `@@index([riderPhone])` on Order (rider dashboard query). Rule of thumb: every column in a frequent WHERE clause gets an index.

**Q: How do you prevent race conditions — e.g., two riders accepting the same order?**
> Atomic UPDATE with a precondition. The accept endpoint does `prisma.order.update({ where: { id }, data: { riderPhone: rider.phone } })` — but before that, a `findUnique` check rejects if `order.riderPhone` is already set and isn't me. For true race-safety I'd use a conditional WHERE in the UPDATE itself (only update if `riderPhone IS NULL`), which is a single atomic SQL statement. Current implementation has a read-then-write gap, which is a known issue I'd close in Phase 2.

**Q: How do you handle migrations?**
> `prisma db push` during development — applies schema changes to the dev DB without creating migration files. For production we'd switch to `prisma migrate deploy` which tracks versioned SQL migrations in a `_prisma_migrations` table. For the internship, `db push` is acceptable; for a production system, migration files get committed to git.

---

## 6. Frontend-specific questions

**Q: How does your order tracker animation work?**
> SVG-based. Two fixed points — shop (vendor) and home (customer) — and a control point above them. The rider moves along a quadratic Bezier curve from shop to home. Each frame I recompute the position using `(1-t)² P0 + 2(1-t)t P1 + t² P2` where t goes 0→1 as the order progresses. Rotation follows the tangent vector via `Math.atan2(dy, dx)`. Pure maths + CSS transitions — no animation library needed.

**Q: Why SVG and not Canvas or WebGL?**
> For this use case (one rider on a static map), SVG is cheaper. It's declarative — I bind the rider's position to React state — and accessible (screen readers can see it). Canvas would need a `requestAnimationFrame` loop and a reconciliation layer between state and pixel ops. WebGL is overkill for 2D with <10 moving elements.

**Q: How does the cart persist across reloads?**
> Zustand's `persist` middleware writes the store to `localStorage` under key `mg-cart-v3`. On every page load, the store rehydrates from localStorage before the first render. I bumped the key version (v2 → v3) when I added the `vendorSlug` field, so stale carts from an older schema don't crash the new code.

**Q: How does the single-vendor cart enforcement work?**
> Inside `cart.add()`, before adding a new item, I check if `items[0].vendorSlug === newItem.vendorSlug`. If not, the function returns `{ ok: false, conflict: {...} }`. The ProductCard component reads that return value and shows a `VendorSwitchDialog`. On confirmation, it calls `replaceCartWith(newItem)` which clears and starts fresh. The API also re-validates this at order-placement time — defence in depth.

**Q: Explain React Server Components to me.**
> A React Server Component renders on the server, has access to the file system / DB, and ships zero JavaScript to the client. Only the rendered HTML and props go down the wire. Client Components (marked `'use client'`) are traditional React — they ship JS, manage state, handle events. In my code: `app/orders/page.tsx` is a Server Component (fetches orders from DB), but `app/orders/[id]/order-detail-client.tsx` is a Client Component (needs `useState` for the reorder button). The handoff is a prop drop.

---

## 7. Backend / API questions

**Q: How did you structure your REST API?**
> Resource-oriented under `/api/`:
> - `POST /api/auth/firebase-session` — exchange Firebase ID token for our session cookie
> - `GET/POST /api/orders` — list / place
> - `GET /api/orders/[id]` — single order + status projection
> - `POST /api/coupons/apply` — validate + preview discount
> - `POST /api/rider/session` — rider sign-in
> - `GET /api/rider/orders` — available + active + history buckets
> - `POST /api/rider/orders/[id]/{accept,pickup,deliver}` — state transitions
>
> HTTP verbs match semantics: GET for reads, POST for state transitions. I didn't use PATCH/DELETE because Phase 1 has no delete flows — if we add "cancel order" it becomes `POST /api/orders/[id]/cancel`, an action endpoint.

**Q: How do you validate incoming requests?**
> Today: manual validation with TypeScript type casts and defensive checks (`if (!Array.isArray(body.items) || body.items.length === 0)`). For production I'd switch to `zod` — a runtime schema validator that integrates cleanly with TypeScript, so `zod.parse(body)` both validates and narrows the type.

**Q: How does your pricing calculation stay consistent between client and server?**
> Single source of truth: `lib/pricing.ts` exports `computeBreakdown()`. The checkout UI calls it to display the total; the order-placement API calls the same function with the same inputs to persist to DB. A malicious client can't send a fake price — the server re-computes from product IDs and stored prices.

**Q: Walk me through the order-placement API.**
> `POST /api/orders`:
> 1. Check session (401 if not signed in)
> 2. Validate `body.items` — non-empty array
> 3. `findMany` products by ID to verify they exist + are in stock (reject otherwise)
> 4. Enforce single-vendor — if distinct vendor count > 1, reject
> 5. If coupon code provided, fetch from DB, check active + not expired + minimum subtotal
> 6. Call `computeBreakdown()` with the real server-side prices
> 7. Upsert user by phone, then `prisma.order.create()` with nested `OrderItem.create` — Prisma handles this as a single transaction
> 8. If coupon applied, increment `coupon.usageCount`
> 9. Return `{ ok: true, orderId }`
>
> The whole thing is wrapped in try/catch, errors return `{ ok: false, error }` with a proper HTTP code.

---

## 8. Security questions

**Q: What OWASP issues did you mitigate?**
> - **Injection** — Prisma parameterises every query; raw SQL is never concatenated.
> - **Broken authentication** — session cookies are httpOnly, secure, sameSite=lax; Firebase handles OTP; phone lookups are unique-keyed.
> - **Broken access control** — every API route that returns user data checks `session.phone` and queries `{ where: { userId: user.id, ... } }`, so a user can't read another user's orders.
> - **XSS** — React auto-escapes all JSX; I don't use `dangerouslySetInnerHTML` anywhere.
> - **CSRF** — sameSite=lax cookies + API routes check origin implicitly (Vercel enforces).
> - **Sensitive data exposure** — payment details never touch my server; we'd token-ise through Razorpay.
> - **Server-side request forgery** — I don't make arbitrary outbound requests from user input.

**Q: How does the delivery OTP prevent fraud?**
> The 4-digit OTP is derived deterministically from `order.id` via a hash. It never leaves the database — the customer sees it on their order page, the rider asks them verbally, and the rider's "Mark delivered" POST submits it for a match check. A rider can't fake a delivery without being physically present with the customer to hear the OTP. It's not cryptographically strong (10,000 possibilities) but for a 4-rider Phase 1 ops model, it's a reasonable deterrent. Phase 2 upgrades to a signed token + photo proof.

**Q: What if someone guesses the OTP?**
> 1 in 10,000 random guesses, and the API will happily accept each attempt — there's no rate limit on the deliver endpoint today. Phase 2 fixes this with a max-3-attempts rule per order, after which the order falls back to manual verification. For the demo, the attack surface is theoretical — a rider has to be signed in as a whitelisted phone, and they already have legitimate access to the customer's address.

**Q: How do you store passwords?**
> We don't use passwords. Authentication is phone + OTP via Firebase. The only persistent identifier we store is the phone number and the Firebase UID — no password hashes, no secret rotation to manage.

---

## 9. Specific algorithm + code questions

**Q: What's the time complexity of your cart-subtotal calculation?**
> `cartSubtotalMrp` is `items.reduce((s, i) => s + i.mrpInr * i.qty, 0)` — O(n) where n is the number of distinct items in the cart. For a typical cart n < 10, so it's effectively constant.

**Q: Your geofence — how does "inside Magarpatta" get checked?**
> In the UI I constrain the society dropdown to known societies, so the address can't fall outside. For actual lat/long geofencing (Phase 2), I'd use a point-in-polygon algorithm — the ray-casting method: cast a horizontal ray from the point, count polygon edge crossings; odd = inside, even = outside. O(n) in polygon vertices. Real implementation would use PostGIS's `ST_Contains` on a geography column.

**Q: Explain the deliveryOtp function.**
> Simple DJB2-style hash: `h = ((h << 5) - h + charCode) | 0` for each character in `order.id`, then `Math.abs(h) % 10000` padded to 4 digits. Deterministic so the same order always produces the same code, no storage needed. Not cryptographic — if you know the algorithm and the order ID, you can compute the OTP — but order IDs are `cuid()` strings that aren't public, so leakage risk is low in practice.

**Q: How does the live tracker poll the backend?**
> `useLiveOrder` hook in `order-tracker.tsx` runs `setInterval(tick, 3000)` — every 3 seconds it fetches `/api/orders/[id]`. When the status becomes DELIVERED or CANCELLED, `clearInterval` stops the poll. The API's response includes `elapsedSeconds` which is `deliveredAt - placedAt` if delivered (frozen), else `now - placedAt` (live). So the counter stops on terminal state, even across page reloads.

**Q: Why `React.cache()` around `getServerSession`?**
> React's `cache` memoises within a single server request. The navbar component and the page itself both call `getServerSession()` — without `cache`, that's two Prisma queries. With `cache`, it's one. The memoisation is per-request, so different users never share cached data.

---

## 10. Testing & quality

**Q: How did you test this?**
> Three layers. (1) TypeScript's type checker — `tsc --noEmit` runs on every build, catches 80% of bugs before runtime. (2) Manual end-to-end — I walked through every user flow in the browser after each feature. (3) API probe scripts — after deployment, I `curl` each endpoint to verify HTTP codes before declaring it done.
>
> What's missing: unit tests (Jest + React Testing Library), E2E tests (Playwright). Not built for this internship scope; I'd add them for a team project.

**Q: What's your error-handling philosophy?**
> On the API: try/catch every handler, always return `{ ok: false, error: string }` with a semantically-correct HTTP code (400 bad request, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 500 server). On the client: every fetch wrapped in try/catch, errors surfaced inline in the UI with user-friendly text, never a browser alert or thrown exception.

**Q: How do you handle database connection failures?**
> Neon pooled connections survive short network blips. If Prisma throws, the catch block returns a 500 with a generic message (not the stack trace — leaking schema details is a security issue). Vercel's function logs capture the full error for me. For production I'd add retry-with-backoff on read paths, though writes should never retry silently — risk of double-charging.

---

## 11. SDLC / project management

**Q: What SDLC model did you follow?**
> Agile / iterative. Each feature was one increment: design → implement → deploy → feedback → iterate. I wrote down rough requirements in a text file, built the MVP in three weeks, and treated each commit as a shippable unit. I did NOT do waterfall — requirements changed three times based on feedback (e.g., single-vendor enforcement was added after a user placed a confusing multi-vendor cart).

**Q: How long did it take?**
> Roughly three weeks of focused work. Week 1: schema + auth + catalogue. Week 2: cart + checkout + order placement. Week 3: rider app + polish + Q&A prep.

**Q: What was the hardest problem?**
> Deploy configuration. The first Vercel deploy failed with "No Next.js detected" because the project is a monorepo — `apps/web` is the actual Next.js root but the Vercel project was pointing at the repo root. Fix was: set `rootDirectory: apps/web` via the Vercel API + declare env vars in `turbo.json` so Turbo forwards them to `next build`. Debugging this took an afternoon of reading Vercel docs and Turbo issues on GitHub.

**Q: What would you do differently?**
> Three things. (1) Write Prisma migrations in version-controlled files from day 1, not use `db push`. (2) Set up Playwright E2E tests early — manual testing doesn't catch regressions after a refactor. (3) Commit more often — my "cart + checkout" commit is 800 lines of diff, too big to code-review cleanly.

**Q: Did you use version control?**
> Git + GitHub. `main` branch is the production line — every push deploys to Vercel. Commit messages follow the "imperative present tense + body" convention. `git log --oneline` shows the progression: schema → landing → auth → catalogue → cart → checkout → tracker → rider app.

---

## 12. "Why not X" questions

**Q: Why not use WordPress / Shopify / Wix?**
> Those are off-the-shelf platforms for off-the-shelf use cases. Single-vendor cart enforcement, delivery-OTP verification, rider hand-off — none of that is a Shopify plugin. I needed full control over the data model and the checkout flow, which means a custom build.

**Q: Why not a mobile app (React Native / Flutter)?**
> Time budget. A mobile app requires a separate codebase, store approval cycle, and push-notification infrastructure. For an internship scope, a progressive web app served on mobile browsers gives 95% of the UX with 10% of the work. If I continue this into a product, I'd ship a React Native wrapper around the same APIs.

**Q: Why not microservices?**
> Premature. Microservices are a solution to a team-scaling problem (10+ engineers stepping on each other) or a deployment-independence problem (auth team ships separately from orders team). For one developer on a 3-week project, a monolith is strictly better — one deploy, one database, one set of types. I'd evolve to a service split at the 5-engineer mark.

**Q: Why not GraphQL?**
> REST is enough. My queries are well-defined (I know which fields the orders page needs), so the "overfetching" argument doesn't apply. GraphQL's added complexity — schema, resolvers, caching — would slow me down without a clear benefit for 15 endpoints.

**Q: Why not Redis for caching?**
> No caching layer yet — every request hits Postgres. Neon is fast enough (sub-20ms for indexed queries) that a Redis layer would be cost-without-benefit at this scale. Phase 2 with 1000+ concurrent users, I'd add Upstash Redis for session caching and rate-limiting.

---

## 13. Personal / learning questions

**Q: What did you learn from this project?**
> Three things stand out. (1) **The full stack is actually learnable** — the abstraction levels (DB → ORM → server → API → client → UI) look intimidating separately, but building one end-to-end teaches you how they plug in. (2) **Deployment is half the work** — writing code that compiles is 50% of the battle; getting it to run on a server I don't own, with environment variables, edge cases, and cache behaviour, is the other 50%. (3) **Scope discipline** — I wanted to build loyalty programs, gift cards, and a vendor app, but I deferred all three because the MVP didn't need them. Saying "not now" is a skill.

**Q: What's the most interesting technical decision you made?**
> Deriving the delivery OTP from the order ID instead of storing it. Saved a schema field + API endpoint + database write, and the determinism means it survives server restarts and database migrations. It's a small thing but it's the kind of "notice you don't need state" decision that separates careful code from bloated code.

**Q: Where did you get stuck and how did you unstick yourself?**
> Firebase Phone Auth gave `auth/reCAPTCHA has already been rendered` errors on retry. I read the Firebase SDK source on GitHub and found that the reCAPTCHA container needed to be cleared (`el.innerHTML = ''`) before re-mounting. That one line of DOM manipulation unblocked three hours of debugging.

**Q: What parts are you proud of?**
> The order tracker — SVG + quadratic Bezier + React state + polling hook, all working together to produce a genuinely polished experience. And the pricing module (`lib/pricing.ts`) — one function, one source of truth, used by both the UI and the API. Clean code is satisfying.

**Q: What would you call "technical debt" in this project?**
> (1) No unit tests — everything is manually verified. (2) `db push` instead of migrations — production needs versioned migrations. (3) Vendor hours are hardcoded in a TypeScript file, not configurable in the DB. (4) Some components are 300+ lines and should be split. (5) The accept endpoint has a read-then-write race condition window. All known, all Phase 2.

---

## 14. Rapid-fire (expect these to be tossed at you)

| Q | A |
|---|---|
| Language of the backend? | TypeScript, running on Node.js via Next.js. |
| Language of the frontend? | TypeScript + JSX (React). |
| Database? | PostgreSQL (Neon, serverless). |
| ORM? | Prisma. |
| Styling? | Tailwind CSS v4. |
| State management? | Zustand for client, React Server Components for server state. |
| Build tool? | Next.js (uses Turbopack / Webpack internally). |
| Package manager? | pnpm. |
| Auth? | Firebase Phone Auth + custom session cookie. |
| Hosting? | Vercel. |
| CI/CD? | git push → Vercel auto-deploy; Turbo caches builds. |
| HTTP methods used? | GET, POST. |
| Response format? | JSON. |
| Cookie security flags? | httpOnly, secure, sameSite=lax. |
| How is the cart persisted? | localStorage via Zustand persist middleware. |
| Total lines of code? | ~4,500. |
| Number of components? | ~20 React components + ~15 API routes. |
| Number of DB tables? | 14. |
| Is the project open source? | On GitHub under DarshMohapatra/magarpatta-go. |

---

## 15. Core CS concept questions (they love asking these)

**Q: What data structures does your code use?**
> - **Arrays** — cart items (`CartItem[]`), order items, sort operations.
> - **Maps / Objects** — `byId = new Map(products.map(p => [p.id, p]))` for O(1) lookup in the order API.
> - **Sets** — `new Set(products.map(p => p.vendor.id))` to detect multi-vendor carts.
> - **Tree** (via React's virtual DOM) — the component tree is a tree; reconciliation diffs two trees in O(n).

**Q: What design patterns did you use?**
> - **Module pattern** — each file exports a focused surface (`lib/pricing.ts`, `lib/orders.ts`).
> - **Observer pattern** — Zustand stores are observable; subscribers re-render when state changes.
> - **Dependency injection** (informal) — Prisma client is injected via imports; the session helper is injected into API routes.
> - **Factory pattern** — `computeBreakdown(items, opts)` is a pure function that produces a new breakdown object.
> - **Singleton** — `prisma` client is a module-scoped singleton to avoid connection-pool exhaustion on Vercel.

**Q: Sync vs async in your code?**
> All I/O is async — `fetch`, Prisma queries, `cookies()`. I use `async/await` throughout, not raw Promises. JavaScript is single-threaded; `await` yields the event loop so the runtime can handle other requests while waiting. If I were on a multi-threaded runtime (Rust, Go), the shape would be different.

**Q: Concurrent requests — how are they handled?**
> Vercel's serverless functions auto-scale: each incoming request gets its own function invocation (a new Node.js runtime). No shared mutable state between requests — the DB is the shared state. This is "shared-nothing" architecture, simple to reason about.

**Q: What's a Promise?**
> An object representing the eventual result of an async operation — has states: pending, fulfilled, rejected. `fetch()` returns a Promise. `await` unwraps it. Under the hood, it's a callback queue tied to the event loop.

**Q: What happens when I type a URL and hit Enter — trace it through your app.**
> 1. Browser DNS lookup → Vercel's edge IP.
> 2. TLS handshake → HTTPS.
> 3. Browser sends HTTP GET with `Cookie: mg_session=...`.
> 4. Vercel routes the request to the nearest serverless function region (Singapore for me).
> 5. Next.js matches the URL against `app/*/page.tsx`.
> 6. Server Component runs: reads cookie, queries Prisma, renders JSX to HTML.
> 7. Response streams back to browser.
> 8. Browser parses HTML, loads JS chunk, hydrates React.
> 9. User interacts — subsequent navigations go through Next's Link prefetch, not full page loads.

---

## 16. Future scope (always expect this question)

> Phase 1 (shipped): auth, catalogue, cart, checkout, live tracking, rider app, OTP verification.
>
> Phase 2 (3–6 months): real GPS rider tracking via Mappls/Google Maps API, vendor tablet app, Razorpay payments, push notifications, multi-address (Home/Work/Other), referral program, ratings + reviews model, GST-compliant PDF invoicing, Playwright E2E tests, Prisma versioned migrations.
>
> Phase 3 (6–12 months): native mobile app (React Native with shared API), ML-based recommendations ("you last ordered X, try Y"), dynamic delivery fee (weather/distance surge), Hindi + Marathi i18n, loyalty tiers, subscription SKUs (daily milk delivery).

---

## 17. Presentation-slide summary (if you need to make slides)

| Slide | Content |
|---|---|
| 1. Title | Magarpatta Go — Hyper-local delivery MVP. Name, college, mentor, date. |
| 2. Problem | 45+ min ETAs, address confusion, generic logistics at the last mile. |
| 3. Solution | Township-scoped delivery, 4 riders, 9 vendors, <25 min. |
| 4. Demo | Live URL, show screenshots: landing, menu, cart, tracker, rider. |
| 5. Architecture | Block diagram — Client / Vercel / Next.js / Prisma / Neon / Firebase. |
| 6. Tech stack | One-line per tool + why. |
| 7. ER diagram | User, Address, Order, OrderItem, Vendor, Product, Category, Coupon. |
| 8. Feature list | Consumer app, rider app, single-vendor enforcement, OTP, coupons, tip. |
| 9. Challenges | Vercel monorepo deploy, Firebase reCAPTCHA, turbo env vars. |
| 10. Learning | Full-stack integration, deployment as code, scope discipline. |
| 11. Future work | Phase 2 roadmap. |
| 12. Thank you | Q&A. |

---

## 18. If they ask "how can we be sure you wrote this yourself"

Pick one of these, practice it:

- **Open a file and walk through it live.** Pick `lib/pricing.ts` — it's 90 lines, entirely your logic. Show the `computeBreakdown` function and explain each branch.
- **Make a small change in front of them.** "Let me change the delivery fee from ₹25 to ₹30 — watch the sidebar re-render."
- **Show your git log.** `git log --oneline` — 12+ commits with reasonable messages, spread over three weeks. A copy-paste project doesn't have that shape.
- **Explain a bug you fixed.** The reCAPTCHA re-render bug, the Vercel rootDirectory issue, the cart persist-key bump — these are the kinds of debug stories you only have if you built it yourself.

---

## 19. One line to end on

> "If there's one thing to take away: this isn't a polished demo on top of a shaky backend — every button you clicked hits a real API, every price is re-computed server-side, every cart persists, and every order creates a real row in Postgres. It's an MVP that behaves like a product."

---

_Good luck. Read this twice Sunday night, once Monday morning. Trust the work._
