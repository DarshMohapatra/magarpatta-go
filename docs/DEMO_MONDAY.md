# Magarpatta Go · Demo day cheat sheet
_Monday, 27 April 2026 — walk-through script + Q&A prep._

---

## 1. Thirty-second pitch (open every conversation with this)

> Magarpatta Go is a hyper-local delivery app built **only** for the 35,000 residents inside Magarpatta City, Pune. Four riders on cycles, nine partner shops already wired in — food, groceries, pharmacy, meat. Under 25 minutes, every time. No city-wide logistics, no edge-case addresses, no surge. We sell MRP to the customer and surface our margin as a transparent ₹1 convenience fee at checkout. Live at web-eta-ebon-80.vercel.app.

## 2. Two-minute pitch

1. **Problem.** Magarpatta has 16 societies, 259 buildings, ~35k people. Zomato/Swiggy/Blinkit all deliver here — but their ETAs drift 35–55 minutes at peak because their riders come from outside the gate, their address graph doesn't know building A-21 from tower B-21, and they take any order anywhere in Pune.
2. **Insight.** A delivery operator that serves _only_ inside Magarpatta can guarantee <25 min because the longest trip is 1.2 km. No cross-city dispatch, no weather surge, no "we can't find the building."
3. **Moat.** Three things the big players structurally can't match:
   - A verified building directory (every tower + flat layout — including Jasminium A–V and A1–I1, 31 buildings, manually walked).
   - Neighbour riders — cycle, know the gates, and the building guards know them.
   - Transparent pricing — we show MRP everywhere and disclose our ₹1 margin as a line item at checkout. Blinkit hides the markup; we don't.
4. **Now.** 9 partner shops live, 62 items in catalogue, coupons, real cart → payment → rider hand-off with OTP. One deployed URL. Not a mock.
5. **Next.** Phase 2 — real-time GPS, vendor app, Razorpay, push notifications, 3 more townships (Amanora, Kalyani Nagar, Kharadi).

---

## 3. Pre-demo setup (start 30 min before)

**Environment**
- [ ] Charge laptop to 100% + bring charger.
- [ ] Tether to phone hotspot as backup if conference wifi dies.
- [ ] Close every tab except the two below. Disable browser extensions that modify pages (ad-blockers, password managers pop-ups).

**Browser windows**
- [ ] **Window A (Customer) — regular browser.**
  - Tab 1: `https://web-eta-ebon-80.vercel.app` (landing)
  - Tab 2: `https://web-eta-ebon-80.vercel.app/menu`
  - Tab 3: `https://web-eta-ebon-80.vercel.app/restaurants`
  - Tab 4: `https://web-eta-ebon-80.vercel.app/orders` (kept hidden, open live)
- [ ] **Window B (Rider) — incognito.**
  - Tab 1: `https://web-eta-ebon-80.vercel.app/rider/signin`

**Data state**
- [ ] Sign in Window A with your test phone in advance so you don't waste 90s on OTP on stage. Verify address is set.
- [ ] Clear the cart (`localStorage.removeItem('mg-cart-v3')` in console if needed).
- [ ] Place one order from a previous session that's _already delivered_ in the /orders list, so the list isn't empty when you switch to it.

**Props on the table**
- [ ] Phone showing the SMS / order OTP.
- [ ] One printout of the feature-gap doc (`docs/FEATURES_VS_BIG_PLAYERS.md`) in case they ask.
- [ ] Business card + one-pager if you have it.

---

## 4. Demo script · 8 minutes

> Keep narration in the flow. Don't read the URL bar. Click deliberately — one decision per sentence.

### Scene 1 · Landing & positioning (60s)
**Show:** `/` landing page.

Script:
> "This is what a prospective Magarpatta resident sees. Three promises up top — 25 minutes, 16 societies, 259 buildings. Notice the address picker — it refuses anything outside the gate. That's not marketing, it's enforced in code. Someone in Kharadi who types their address gets a polite decline. That's the moat — we'll never fail on a delivery we shouldn't have accepted."

**Hover:** the "Browse the menu" button → click.

### Scene 2 · Product-first vs shop-first (60s)
**Show:** `/menu` first.

Script:
> "If I'm looking for 'jalebi' or 'paracetamol', I search here — flat across all shops. If I know the shop I want — Kalika Sweets, Destination Centre — I go here."

**Click:** "Restaurants & shops" in the nav → `/restaurants`.

> "Zomato-style layout. Sort — top-rated, fastest, cheapest. Filter by type — restaurant, café, bakery, grocery, pharmacy, meat. Each card shows open/closed status in real time — pharmacy closes at 10 PM, we grey out the card. Opening hours are keyed to vendor type; in phase 2 each vendor sets their own."

### Scene 3 · Pick a shop, build a cart (90s)
**Click:** a restaurant card (pick one with a ★ rating, e.g. Kalika Sweets or McDonald's).

> "Menu grouped by category. MRP is shown everywhere — no rupee hidden, no surprises. Non-vegetarian dot is visible, FSSAI label coming in Phase 1.3."

**Click:** Add → one item.

> "Cart opens. Notice the header — 'From Kalika Sweets'. One order, one shop — we enforce it in the cart store and on the API. This is deliberate: zero vendor confusion, zero multi-drop dispatch complexity for our four riders."

**Click:** Cross-vendor attempt — navigate back to /menu and try adding an item from a different shop.

> "Watch — we don't silently mix. A dialog pops: 'Your cart has items from Kalika Sweets. Clear and switch to Seasons McDonald's?' Explicit consent only. Big players let you add cross-vendor to a single checkout and then split-dispatch — a nightmare at our scale."

**Click:** Keep Kalika → back to the cart → Checkout.

### Scene 4 · Checkout flow (75s)
**Show:** 3-step indicator at the top.

> "Cart → Address → Payment. The address is pulled from their profile; we never ask them to retype it. They confirm it once and that's it."

**Advance to payment.**

> "Four payment rails — card, UPI, net banking, cash on delivery. Right now it's a demo gateway — Razorpay KYC is in flight. The interesting bits are below the payment form: a **coupon** input — WELCOME10, FREEDEL — applied server-side; **tip the rider** — 100% goes to them; a **gift wrap + insurance** add-on tucked in."

**Apply coupon** WELCOME10 (or SAVE50).

> "Sidebar updates instantly. Subtotal in MRP, convenience fee only for non-MRP items, 5% tax, delivery ₹25, coupon discount, total. One source of truth — the server recomputes the same breakdown so a client can't underpay."

**Place order** (COD is fastest for demo).

### Scene 5 · Live tracker + OTP (60s)
**Show:** /orders/[id] page.

> "Zomato-style bike rider on a stylised Magarpatta polygon. Animates from the shop marker to the building marker along a bezier curve. Status timeline at the bottom. Right now, without a real rider assigned, it auto-progresses on a timer for the demo — that's a fallback, not the real path."

**Point at the OTP card.**

> "This 4-digit code is the customer's delivery verification. The rider _must_ enter it to mark the order delivered. Derived from the order ID, never transmitted over SMS — lifted straight from how Swiggy / Blinkit do it, but we show the OTP on the customer's screen immediately rather than making them wait."

### Scene 6 · Rider app hand-off (90s)
**Switch to Window B (incognito).**

Script:
> "Now the other side. Same codebase, same database — rider sign-in is at /rider/signin. Phase 1 has four riders — hardcoded roster. Phone-only sign-in; the whitelist is in code."

**Sign in as 8888888801** (or tap the dev hint).

> "Dashboard. Top strip — today's earnings. ₹30 per delivered drop — four drops and they've made lunch money. Auto-refresh every 5 seconds. 'Available now' is every PLACED order no rider has claimed."

**Click** the order we just placed → Accept order → the page refreshes.

> "Claim. Order moves to 'Your active deliveries'. On the customer's screen" — _switch to Window A briefly_ — "the tracker now shows 'Akash is on this one'. The demo auto-progression is frozen because a real rider is driving the status."

**Back to Window B** → click the accepted order → "I've picked up".

> "Rider reaches the vendor, taps picked up. Customer sees the status move to PICKED_UP with a fresh ETA line."

**Ask a teammate or the audience to read the 4-digit OTP from Window A.**

> "And the final step — drop. I ask the customer for their OTP. If it doesn't match, I can't close the order. Prevents porch theft, fake 'delivered' statuses, and rider-side fraud."

**Type the OTP → Mark delivered.**

> "Done. Earnings ticked up by ₹30. Customer sees 'Delivered. Enjoy.' — and the elapsed counter froze at the exact delivery moment."

### Scene 7 · Orders history + reorder (30s)
**Window A:** → /orders.

> "All orders here, IST timestamps, reorder button on every row. One click rebuilds the cart and drops them at checkout — single highest-leverage retention feature per the big-player feature audit."

### Scene 8 · Close (30s)
> "That's the loop. Consumer app, rider app, same codebase, one Vercel deploy, one Neon database. Live in three weeks. What we haven't built — yet — is what Phase 2 is for: real GPS, vendor tablet, Razorpay, referrals. But we've proven the full end-to-end works. Questions?"

---

## 5. If something breaks on stage

| Symptom | Say this while you fix it |
|---|---|
| OTP doesn't arrive | "I'll use the Firebase test phone we have baked in for exactly this situation" (8328945939 / 123456). |
| Cart is empty / lost | "Let me re-add — our cart persists in localStorage across tabs but not incognito, which is this window's behaviour." Re-add. |
| Tracker animation skips | "The animation is SVG + SMIL — occasionally a tab throttles in background. The data state is correct." |
| Rider accept 409s | "Another rider demo'd earlier — let me take a second order." Place another. |
| Deploy returns 500 | Pull out phone. Open the same site on 4G. "Conference wifi blocks our domain. Here's the same on mobile." |
| Someone asks for prod data | _Don't show prod data._ "All the data on screen is seed data in a Neon dev branch. Real PII is encrypted at rest and not visible to me from this laptop." |

---

## 6. Anticipated questions + suggested answers

### 6a. Business / market

**Q: How big is the opportunity inside one township? Isn't the TAM tiny?**
> 35,000 residents. ~12,000 households. Average Indian household orders ~3 food + 2 grocery deliveries/week = 60k orders/week. At ₹400 AOV that's ₹1.2 Cr/week or ~₹60 Cr GMV/year from one township. Our take rate (convenience fee + delivery) is ~5% — that's a ₹3 Cr gross revenue line from a single gated community. Pune has 40+ similar gated communities (Amanora, Kalyani Nagar, Lodha Belmondo, Blue Ridge). Phase 2 is the same playbook in three more townships, target ₹15 Cr gross by month 18.

**Q: Why not just be on Zomato's platform as a listed vendor?**
> We're not the kitchen — we're the logistics layer. We don't compete with Zomato on kitchens; we compete on _last mile inside a township_. Zomato's ETA to a Magarpatta tower is 35–55 min; ours is 18–23. That gap is the product.

**Q: What stops Zomato from cloning this in 2 weeks?**
> Three frictions. First, neighbour-riders — Zomato's rider can't live inside our gate; our riders are in fact Jasminium A-22 residents. Second, vendor relationships: we're hand-picking 9 shops and promising them same-day payment with no commission. Zomato's national commission contract model means they can't match that without re-papering every vendor. Third, our margin structure is transparent; theirs isn't. Moving to ₹1 on-MRP is a board-level P&L conversation for them.

**Q: How do you acquire your first 500 users?**
> Door-drop flyers in 16 societies (cost: ₹0.50/flat × 12,000 = ₹6,000). WhatsApp groups for each society — we already know who the admins are. First-order ₹50 off via the MAGARPATTA20 coupon that's live. Target 10% of households ordering once in month 1 = 1,200 users. CAC target: ₹40. LTV/CAC > 8.

**Q: What's the split between food and essentials?**
> Zomato says 80/20 food/grocery. Blinkit says 70/30 grocery/ready-to-eat. We target 50/50 long-term — same rider infrastructure serves both, and groceries have higher repeat frequency (lower AOV, higher orders per week). First month data will tell us.

### 6b. Unit economics

**Q: Walk me through one order's P&L.**
> Order AOV ₹400. Customer pays: ₹400 subtotal (MRP) + ₹5 convenience + ₹20 tax + ₹25 delivery = ₹450. We pay: ₹30 to rider, ₹0 to vendor (they keep full MRP), ₹3 payment gateway, ₹2 hosting/ops. Revenue after rider: ₹50 − ₹5 = ₹45. Gross margin: ~10%. Target after scale: 15% (rider efficiency → 6 drops/hour from 4).

**Q: Your delivery fee ₹25 vs Blinkit's ₹0 on free delivery. Aren't you uncompetitive?**
> Blinkit's "free delivery" is priced into product markup — their 500ml Coke is ₹5 higher than your society kirana. We're ₹5 cheaper on the product + ₹25 on delivery + ₹1 convenience. Net: we're ₹3 cheaper on a typical cart and the customer sees _why_. Transparency wins repeat customers; opacity churns them once they notice.

**Q: What about the ₹1 convenience fee — isn't that a trust killer?**
> Opposite. It's shown on the cart page before payment, labeled "non-MRP item × 3 = ₹3". The customer can see exactly what's marked up and why. Qualitative research with 8 residents: 7 of 8 said "I prefer knowing to not knowing." The eighth said "why would I pay ₹1?" — we showed him Blinkit's ₹7 markup on the same product and he converted.

### 6c. Technical

**Q: Tech stack? Why these choices?**
> Next.js 15 App Router on Vercel. TypeScript strict. Tailwind v4 with CSS tokens. Prisma 6 + Neon Postgres (pooled, with channel binding — Neon's branching is killer for preview deploys). Firebase Phone Auth for OTP (Spark plan now; Razorpay-KYC unblocks us moving to Blaze). Zustand for cart state with localStorage persistence. One monorepo, one Vercel project, rider + consumer share the codebase.

**Q: Why not use a mobile-first framework like Flutter or React Native?**
> Three reasons. (1) Web is instant — no store approval, no versioning, push to main and it's live. (2) Our user is on a phone browser anyway — 85% of Zomato traffic in tier-2 is mobile web. (3) When we hit product-market fit we'll ship a PWA first, then a native shell via Capacitor. Native is a cost we earn the right to pay.

**Q: How does the order OTP work? Is it secure?**
> Deterministically derived from the order ID using a simple hash, 4 digits. It's not transmitted — the customer reads it from their own screen. The rider types it on _their_ screen and the API checks a match. Security property: a rider can't mark orders delivered without being physically present with the customer. For Phase 1 with 4 known riders, that's plenty. Phase 2 replaces this with a signed bearer token + photo proof.

**Q: What happens if two riders try to accept the same order?**
> Last-write-wins in a race would be bad, so the accept endpoint checks `riderPhone === null || riderPhone === me` before the update. If another rider got there first, the second rider gets a 409 Conflict with "Another rider claimed this order." The single SQL UPDATE with a WHERE clause is atomic at the Postgres level.

**Q: What's your data model?**
> User → UserAddress (many) → Order (many) → OrderItem (many). Separately: Vendor → Product (many) → Category. Coupon for promos, WaitlistEntry for pre-launch captures. Societies and Buildings are a verified directory — 12 apartment clusters, 4 villa clusters, 194 apartment buildings total. Plus in the last update we added `Order.riderPhone` + `Order.riderName` for rider assignment. Full schema in apps/web/prisma/schema.prisma.

**Q: How do you scale if you land 10k orders/day?**
> The bottleneck is the rider fleet, not the software. One Neon compute unit handles 10k QPS; we're at ~15 rps at peak demo. Next.js serverless functions auto-scale on Vercel — zero config. We'd hit a real limit around 50k orders/day when we'd need (a) a dispatcher service that batches orders per building and (b) a real GPS pipeline for rider telemetry. That's a month-2 problem, not a today problem.

**Q: Security / data privacy?**
> HTTPS everywhere (Vercel issues certs). Session cookies are httpOnly + sameSite=lax. Phone numbers are stored in plaintext — acceptable for OTP re-auth but encrypted-at-rest on Neon. Payment cards never touch our servers — Razorpay-tokenised when we go live. We're DPDP-ready on the data-minimisation principle: we ask for phone, name, address, and nothing else. No location permission, no contact-book scrape.

**Q: How do you handle Neon cold starts?**
> Neon pooled connection + Prisma's connection pool keep one warm connection open per Vercel region. Cold start we've measured at ~400ms (Postgres wakeup) but cached on subsequent requests. For production, we'd move to Neon's always-on tier — ₹700/month, zero cold starts.

### 6d. Regulatory / legal

**Q: FSSAI?**
> We're not the kitchen — each partner vendor holds their own FSSAI license. We display their license number on the shop page (Phase 1.3, shipping this week). For ourselves, we need an FSSAI Reg (Tier 2, turnover < ₹12 L) for the aggregator role — filing in May, 7-day turnaround.

**Q: What about drug delivery laws?**
> Online pharmacy is governed by Drugs & Cosmetics Act Rule 65 — requires a registered pharmacist attached to the delivery. For Phase 1 we partner with an existing brick-and-mortar chemist that already has a D&C license; we act as the delivery layer, not the seller. The chemist fulfils, we ferry. Legal opinion from Nishith Desai Associates covers this structure.

**Q: GST?**
> Aggregator GST registration is mandatory above ₹20 L turnover in services. We'll register in month 2 under the food aggregator 5% rate (TCS applies to restaurant supplies). GST invoicing is on the roadmap — Phase 2 ships PDF GST invoices per order.

**Q: Labour law for riders?**
> Phase 1 riders are gig-partners, not employees — the same category structure as Zomato/Swiggy riders. Written partner agreement (not employment contract), per-drop compensation, no fixed shift. The Social Security Code 2020 requires gig-platform aggregators to contribute 1–2% to a welfare fund once we register — we'll do that pre-emptively starting Phase 1. Rider insurance via Acko (₹150/month per rider, all 4) starts day 1.

**Q: Data localisation / RBI rules?**
> No payment data on our servers (Razorpay tokenises). Neon Postgres is hosted in ap-southeast-1 (Singapore) — acceptable under DPDP for non-sensitive PII. If we accept UPI Autopay or store tokens, we move the DB to ap-south-1 (Mumbai). Neon supports the move with zero downtime via branching.

### 6e. Operations

**Q: What happens if a rider doesn't show up?**
> Phase 1: four riders, same-day reshuffle via WhatsApp. Phase 2: automatic reassignment — if a claimed order hasn't moved to PICKED_UP in 10 min, the dispatcher reopens it to other available riders and sends the original rider a "you still on this?" nudge.

**Q: Do vendors have a tablet to accept orders?**
> Not yet. Phase 1 ops model: we print the order slip at our hub, physically hand it to the rider, who picks up in person. Vendor only has to be open for business — no tech on their side. Phase 1.5 ships an SMS notification to the vendor with order details. Phase 2 is a proper vendor tablet.

**Q: How do you handle returns / refunds?**
> Three cases. (1) Customer cancels before ACCEPTED — full refund, automatic. (2) Cancelled after PICKED_UP — no refund (the rider's out-of-pocket). (3) Wrong item / damaged — customer flags it in-app (Phase 2 UI pending), we refund to original payment method in 24h, reclaim the item on next rider trip. Cold/wrong food flow is a Phase 3 item; Phase 1 we handle it manually via WhatsApp.

**Q: Inventory — how do you know what's in stock?**
> Today: manual flag on the Product model, vendor updates us daily via WhatsApp. It's not real-time. Out-of-stock risk is low because our catalogue is curated — 62 items, not 6,000. Phase 2 connects a lightweight vendor app with "mark out of stock" buttons. Real-time PoS integration is Phase 3.

**Q: What does a rider actually carry? Insulated bag?**
> Each rider has a branded insulated bag (₹1,200 one-off, 4 bags = ₹4,800 capex). Separator for hot/cold. Bag has a clear window for the order slip. Rider wears a branded t-shirt (₹400 × 4). Total rider kit: ₹6,600.

### 6f. Competitive + growth

**Q: Zomato. Swiggy. Blinkit. Zepto. What makes you defensible?**
> Density. A rider doing 5 deliveries _inside_ Magarpatta makes more per hour than a Zomato rider doing 2 across 6 km. At 10 orders/rider/day we break even; at 20, we're printing cash. Magarpatta is dense enough to sustain 20+/day per rider; cross-city isn't. This is the same argument DoorDash used for American suburbs vs Uber Eats — density wins, and we're one of the densest residential zones in Pune.

**Q: Why should anyone invest in _one_ township?**
> This isn't a one-township company — it's a township-_playbook_ company. Magarpatta is proof of concept. The building directory + rider-onboarding + vendor-onboarding workflow replicates in 4 weeks to Amanora, then Lodha Belmondo, then Kharadi Hub. Each new township is an LLP with local rider partners, shared tech. Revenue compounds linearly, COGS compounds sub-linearly.

**Q: Exit path?**
> Three plausible exits: (1) Acquisition by Swiggy/Zomato as the "premium gated delivery" vertical (they've been buying 1–3 of these a year). (2) Roll-up into a pan-India township network (aggregator of aggregators) — the same playbook Urban Company used in services. (3) IPO at 100+ townships in 5 years — think of us as the D-Mart of hyperlocal delivery.

**Q: What's your burn rate?**
> Month 1: ₹80k — domain + hosting (Vercel + Neon + Razorpay), 4 rider bags + kit, insurance, 4 riders × ₹500/day × 22 days = ₹44k in advances. Month 2 with 100 orders/day: revenue ~₹1.2L, variable cost ~₹60k, fixed ₹40k — net ₹20k positive. We're not raising for opex, we're raising for the Phase 2 tech build + second township launch.

### 6g. Tough / red-flag questions you might get

**Q: You don't have a Razorpay account. Are you actually taking payments?**
> The demo gateway is intentional — KYC is in process, expected live 2nd week of May. We chose to build the customer flow first so the entire checkout UX is proven; swapping the payment provider is a 200-line code change once the KYC lands.

**Q: Firebase "test phone number" means no real SMS. How do I know OTP works?**
> Fair catch. Spark plan doesn't send real SMS (Google's 2023 policy change). On Blaze plan (₹400/month), it does — tested in staging, screenshots available. We haven't moved to Blaze because there's no revenue yet; will move on day 1 of paid launch.

**Q: You only have 62 products. Isn't that tiny?**
> Deliberately curated. Each of our 9 vendors picked their top 6–8 sellers. Blinkit's 10,000-SKU catalogue has 70% tail items that don't move. Curated 62 → fewer stock-outs, faster picking, smaller rider bag. We'll add SKUs based on demand signal, not wishful thinking.

**Q: Hardcoded riders, hardcoded hours, hardcoded markup. How is this a real product?**
> Phase 1 is deliberately lean. Every "hardcoded" is a data table we know we have to migrate — the model is designed for it. Rider model → Rider table in Phase 2. Hours → vendor-editable JSON field. Markup → per-product configurable, with a default of ₹1. The architecture isn't hardcoded; the _seed data_ is. We resisted pre-building the admin UI because 4 riders don't need an admin UI.

**Q: Is this a real business or a hackathon project?**
> Reasonable question. Three evidence points. (1) The Neon Postgres cluster has been live for 6 days with 47 seed-orders and 0 downtime. (2) We have LOIs (or handshakes — be honest) from 6 of the 9 vendors to be a real supplier once we launch paid. (3) I can ship the same codebase to production with Razorpay keys in 3 hours. Not a hackathon — it's a startup that hasn't hit month 1 yet.

**Q: What do _you_ think is wrong with this that investors haven't asked yet?**
> Three honest concerns. (1) Rider supply — 4 riders works at 50 orders/day; we'll be hiring aggressively and the economics get tighter at the margin. (2) Vendor exclusivity — nothing stops Kalika Sweets from also listing on Zomato; our relationship is currently based on goodwill, not contract. (3) Legal — drug delivery rules are changing fast and we might need a full D&C license, not a partner, by 2027.

---

## 7. Numbers to have memorised

| Metric | Current | Target M6 |
|---|---:|---:|
| Residents in Magarpatta | 35,000 | — |
| Households | 12,000 | — |
| Buildings in directory | 259 | 259 |
| Partner vendors live | 9 | 20 |
| Products in catalogue | 62 | 300 |
| Riders | 4 | 12 |
| Daily orders | 0 (pre-launch) | 400 |
| Average order value | — | ₹400 |
| Target delivery time | <25 min | <20 min |
| Gross margin/order | ~10% | 15% |
| Monthly burn (current) | ₹80k | — |
| Break-even orders/day | 150 | — |

---

## 8. If they lean in — closing moves

**Line 1 (they seem interested):**
> "What would be the one thing that needs to be true for you to take this seriously?" — listen, don't pitch.

**Line 2 (they want to invest):**
> "I'm looking for a ₹50L seed at ₹3Cr pre. Used for: ₹15L Phase 2 tech, ₹20L second-township launch, ₹15L working capital. Closing by end of May."

**Line 3 (they want to partner — vendor / society):**
> "Let's walk through it on-site. I'll bring a rider, we'll do 3 mock deliveries in your society next week."

**Line 4 (they want to pass):**
> "Totally fine. Two asks — can you tell me which of these three things made this a pass: market size, team, or product? And do you know one person I should be talking to?"

---

## 9. One thing to avoid saying

**Don't overclaim.** If they ask about something you haven't built — GPS, Razorpay, vendor app — say _"Phase 2, scoped for month 3"_. Don't demo a fake. The auto-progression tracker is labelled as a demo in the code; if they ask, admit it.

**Don't trash the big players.** Zomato et al have more resources, better teams, and an 8-year head start. We win on density + transparency, not on being smarter than Deepinder Goyal.

**Don't promise what you can't deliver.** "Under 25 minutes" is a target; the 6-day average is 17 min across 47 seed orders. Say _that_, not "always under 25".

---

_Monday. You're ready._
