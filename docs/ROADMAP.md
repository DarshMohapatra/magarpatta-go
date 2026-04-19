# Magarpatta Hyper-Local Delivery Platform
## Technical & Operational Roadmap

**Prepared:** 2026-04-17
**Scope:** Hyper-local delivery (food, groceries, medicines, fresh meat, daily essentials) exclusively for Magarpatta City, Pune.

---

## 0. Day-0 Blockers (Resolve Before Any Build Work)

### 0.1 Legal flag on the "MRP + ₹1" pricing rule
Under India's **Legal Metrology (Packaged Commodities) Rules, 2011 (Rule 18 / Sec. 36)**, selling a pre-packaged commodity **above the printed MRP is a punishable offence**.

- **Applies to:** packaged groceries, FMCG, medicines, packaged meat.
- **Does NOT apply to:** restaurant-prepared food, sweets sold loose by weight, fresh/loose produce, fresh meat cut to order, bakery items without MRP.

**Recommendation:**
- Apply the "+₹1" rule **only** to non-MRP categories.
- For MRP-regulated goods: list at MRP and recover margin via a **platform fee / convenience fee / delivery fee** line item.
- Every price mutation must be event-sourced and auditable (Legal Metrology can demand records).

### 0.2 MTDCC MoU
Magarpatta City is a private gated township managed by **Magarpatta Township Development and Construction Company (MTDCC)**. An MoU covering rider access, gate-pass integration, and commercial activity within the township is a **non-negotiable prerequisite** to launch.

### 0.3 Category-specific licensing
- FSSAI (food + meat)
- Drug License (Schedule-H medicines require a registered pharmacist partner)
- Shops & Establishments (Pune Municipal Corporation)
- GST registration

---

## PHASE 1 — MVP & Magarpatta Launch

**Duration:** 16 weeks | **Complexity:** HIGH (operations, not tech)
**Target:** ~200 orders/day, 4 riders, <30 min median delivery, unit-economic positive.

### 1.1 Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Customer app | React Native (Expo EAS) + TypeScript | Single codebase iOS/Android; Hindi/Marathi/English i18n |
| Customer web | Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui | SEO for local search, PWA for low-end devices |
| Rider app | React Native, offline-first (WatermelonDB), background location | Handles basement/lift dead zones |
| Vendor/merchant app | React Native on Android tablet | Cheap Lenovo/Samsung tabs at each hub |
| Admin/ops console | Next.js 15 + shadcn/ui | Internal dispatch board, audit, refunds |
| Backend | NestJS (Node 20) **modular monolith** — domains: identity, catalog, orders, dispatch, payments, pricing | 4 riders do not justify microservices |
| Realtime | Redis Pub/Sub + Socket.IO + FCM fallback | Low-latency dispatch + reliable push |
| Primary DB | PostgreSQL 16 + **PostGIS** | Polygon geofence, nearest-hub, ST_Contains |
| Cache/queue | Redis + BullMQ | Order state machine, retries, batching windows |
| Object store | Cloudflare R2 | Cheaper egress than S3 |
| Payments | Razorpay (UPI-first, cards, COD) | ~85% UPI share expected |
| Observability | Grafana Cloud + Sentry + PostHog | Product + errors + infra |
| Hosting | AWS `ap-south-1` (Mumbai): 2× t3.medium behind ALB, RDS `db.t4g.small` Multi-AZ | ~₹18–25k/month |
| Web deploy | Vercel (for Next.js marketing + web app) | Fast iteration, edge geofence pre-check |

### 1.2 Mapping, Geolocation & Geofencing

**The core moat.** Treat this as the single most important engineering deliverable of Phase 1.

- **Geofence polygon:** Hand-digitize the Magarpatta City boundary in **QGIS** from MTDCC master plan + satellite imagery. Export as GeoJSON, store as `geometry(Polygon, 4326)` in PostGIS. Define:
  - `magarpatta_core` (inner township polygon)
  - `magarpatta_adjacent` (covers DC, Seasons Mall, Kalika Sweets, Hadapsar border sourcing zone)
- **Address-validation pipeline** (serial; all three must pass):
  1. **Mappls (MapmyIndia) Places API** — best India-specific apartment resolution. Google Places misses interior Magarpatta towers.
  2. Reverse-geocode → `ST_Contains(magarpatta_core, customer_point)`. Reject outside.
  3. **Building dictionary enforcement** — maintain curated `buildings` table of the ~120 towers (Aspen, Cosmos, Erica, Iris, Jasminium, Laburnum Park, Daffodils, etc.) with centroid + polygon. User **must** select building from a dropdown; free-text address is rejected. Nanded City and adjacent non-Magarpatta societies are **explicitly excluded**.
- **Rider geofence:** location ping every 10s on-duty / 45s idle. Exit of adjacency polygon > 90s mid-order → auto-page dispatch.
- **Licensed APIs:** Mappls Maps SDK (primary), Google Maps JS API (web admin only), OpenStreetMap + self-hosted OSRM for routing.

### 1.3 AI / ML / Data Science (Phase 1)

**Honest assessment:** 4 riders × ~200 orders/day = insufficient volume for deep learning. Ship **rule-based + classical** intelligence.

- **Dispatch:** Greedy **insertion heuristic** for dynamic VRP with time windows. On every new order, compute marginal insertion cost against each rider's current route (OSRM matrix) respecting food-ready-time + SLA. Explainable to ops.
- **Batching rule:** Up to 3 orders per rider iff (a) pickup hubs ≤ 400m, (b) drop buildings share same cluster (k-means on 120 buildings → ~8 clusters), (c) total detour ≤ 6 min.
- **Demand forecast v0:** Rolling median by (hour × day-of-week). Graduate to Prophet/SARIMAX after 3 weeks of data.
- **Personalization v0:** "You & your neighbours" — top-N items by your tower in last 14 days. Simple; highly effective in dense townships.
- **Fraud:** Velocity rules + device fingerprint (FingerprintJS). No ML.

### 1.4 Innovative Hyper-Local Features (Phase 1)

Competitors structurally cannot copy these because they don't live here.

1. **Tower-level group orders ("Society Cart")** — residents of one tower pool orders in a 20-min window; single drop to tower lobby with QR pickup wall. Cuts last-mile cost ~60%.
2. **Gate-pass integration** — Magarpatta uses MyGate / NoBrokerHood. Auto-issue rider gate pass on order placement; zero guard-desk wait.
3. **Lift-aware ETA** — ETA model includes building-specific lift wait time (Aspen 3 lifts, Cosmos 1 slow lift — users know this, ETA should too).
4. **"Running to Seasons Mall" concierge** — flat ₹49 pickup of any in-stock mall item within 25 min. Zero catalog needed.
5. **Kalika Sweets fresh-drop push** — live notification when a fresh batch (jalebi, samosa) is out of the kadhai. Pure local-presence leverage.
6. **Medicine refill calendar** — scan prescription once, auto-remind + one-tap reorder. Crucial for sizable senior demographic.
7. **Veg / Jain / Satvik strict filter** — township skews vegetarian; first-class filter, not a tag.

### 1.5 Timeline

| Weeks | Milestone |
|---|---|
| 0–2 | MTDCC MoU, legal counsel, vendor LOIs (DC, Seasons, Kalika, 1 pharmacy, 1 meat shop), company reg, FSSAI |
| 2–6 | PostGIS geofence digitization, building dictionary, auth + address flow, vendor tablet skeleton |
| 6–10 | Catalog ingest, order state machine, Razorpay integration, rider app with live location |
| 10–13 | Dispatch board, greedy batching, ops console, internal UAT with 1 rider |
| 13–15 | Closed beta: 100 residents from 4 towers, real 4-rider ops, daily retros |
| 15–16 | Public launch within Magarpatta |

### 1.6 Bottlenecks to Clear Before Phase 2

- **Vertical GPS drift:** 14–22 floor towers; horizontal GPS fine, floor/unit not. → forced tower + flat dropdown; rider confirms with "delivered" photo + OTP.
- **Basement / lift dead zones:** rider app queues state changes offline and syncs.
- **4-rider peak saturation:** dinner rush (19:30–21:30) will break. Batching heuristic must be proven before growth.
- **MRP compliance** (see §0.1) — blocking.
- **Vendor inventory truth:** paper-based stock at Kalika/DC → oversells. Phase-1 workaround: aggressive OOS toggling + SLA-backed vendor penalty clause.

---

## PHASE 2 — Fleet & Hub Optimization

**Duration:** 20–24 weeks | **Complexity:** HIGH
**Target:** 12–18 riders, 3–4 dark-stocked micro-hubs, >800 orders/day, <22 min median.

### 2.1 Tech Evolution
- Extract **Dispatch** and **Catalog** into separate services (strangler pattern; not a rewrite).
- OSRM on dedicated instance + **live-traffic overlay** from Mappls.
- Introduce **feature store** (Feast on Postgres).
- **CDC pipeline:** Debezium → Kafka → ClickHouse for analytics. Stop querying OLTP for dashboards.
- Rider app: **Bluetooth beacons** at hub entrances for automatic "arrived-at-pickup" (kills fake check-ins).

### 2.2 ML Graduations
- **Dispatch:** greedy-insertion → **metaheuristic VRP** (OR-Tools with Guided Local Search), re-solved every 60s. Greedy kept as fallback.
- **ETA model:** LightGBM on `[distance, hour, day, rain, hub_queue_len, tower_floor, rider_current_load]`. Target <90s MAE.
- **Demand forecasting:** LightGBM with lag features per-SKU × per-hub × 15-min → auto reorder suggestions for hub managers.
- **Dark-store stocking:** classical **newsvendor** with asymmetric over/under-stock cost by category (meat high perish; staples low).
- **Personalization v1:** implicit-feedback matrix factorization (ALS) with "building" as side feature.
- **Rider ops:** survival model on idle-time; MIP-based shift generator for 4 → 18 riders.

### 2.3 Phase 2 Features
- **"Magarpatta Prime Lite"** — tower-level subscription with RWA-negotiated discount if ≥50 flats subscribe.
- **Empty-trip back-haul** — rider returning empty offers ₹19 "grab-one-thing" slot.
- **Event-aware surge suppression** — read Magarpatta Club / Amanora event calendar; pre-stage riders; don't surge (anti-Zomato differentiator, great PR).
- **Senior mode UI** — large font, voice order in Marathi/Hindi, single-tap medicine refill.
- **Shared chilled lockers** — negotiated lobby lockers in 6–8 towers for unattended grocery drops.

### 2.4 Bottlenecks
- **Hub–rider balance:** OR-Tools will propose routes riders refuse. Need rider-feedback loop re-weighting the cost function. Most startups fail quietly here.
- **ClickHouse cost discipline:** cardinality on `building_id × sku × minute` will bite.

---

## PHASE 3 — Advanced Automation & Intelligence

**Duration:** 36+ weeks | **Complexity:** EXTREME (organizational, not code)
**Target:** defensible ML moat; contiguous expansion Amanora → Hadapsar → Kharadi **only after** Magarpatta LTV/CAC > 3.

### 3.1 Tech
- Full service split: Identity, Catalog, Pricing, Dispatch, Fulfilment, Payments, Notifications, Analytics. EKS.
- **Pricing service** becomes first-class — dynamic fees, subscriptions, promos, the non-MRP ₹1 rule, full audit log exportable to Legal Metrology.
- **Edge geofence** via Cloudflare Workers — out-of-zone requests never reach origin.

### 3.2 Advanced ML
- **RL dispatch** (PPO) trained in simulation on historical Magarpatta trajectories. Shadow-mode against OR-Tools ≥8 weeks before any live traffic.
- **Causal uplift** for promos — target only residents where uplift > cost.
- **Vendor counter vision** — optional YOLO on cheap cameras for auto-verifying order contents before pickup (kills mis-pack disputes).
- **LLM support agent** (Claude Sonnet 4.6) with tool-use over order state. Target 70% auto-resolution. Read-scoped tools until accuracy proven.
- **Graph recommendations** — bipartite (user, item) + "lives-in-tower" edges; GraphSAGE.

### 3.3 Moonshots
- **Drone corridor pilot** — Magarpatta's flat rooftops + private airspace is one of the few feasible pilots in Pune. BVLOS permits take 9+ months; start DGCA paperwork in Phase 2.
- **Predictive pre-positioning** — riders dispatched to a cluster *before* an order is placed (92%-confidence 10-min-ahead forecasts).
- **Carbon-neutral township badge** — all-EV fleet + MTDCC co-branded sustainability report; unlocks Magarpatta Cybercity corporate catering.

### 3.4 Bottlenecks
- **Model governance** — with RL dispatch you need kill-switches, canary cohorts, and an Ops-VP who understands them.
- **Talent density** — real ML engineers don't work on 4-rider startups. Hire remotely, compensate with equity.
- **Regulatory surface area** — medicines (CDSCO), meat (FSSAI + municipality), drones (DGCA), pricing (Legal Metrology). Dedicated compliance lead by month 9, not month 15.

---

## Cross-Phase Summary

| | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| Duration | 16 weeks | 20–24 weeks | 36+ weeks |
| Riders | 4 | 12–18 | 30+ |
| Daily orders | ≤ 200 | 800–1500 | 3000+ |
| Tech complexity | Medium | High | Extreme |
| Ops complexity | High | High | Extreme |
| Dominant risk | Legal / MTDCC / MRP | Dispatch quality at scale | Model governance + regulation |

---

## CTO Veto List (non-negotiable)

1. No item priced above printed MRP on a regulated package. **Ever.**
2. No microservices in Phase 1. You will regret the ops overhead within 6 weeks.
3. No ML model in production without A/B ramp and manual override. At 4 riders, one bad dispatch decision is 25% of fleet.
