# Magarpatta Go vs. Zomato / Swiggy / Blinkit
## Feature gap analysis · April 2026

> Scope note: this is an honest audit of what the three category leaders have that we don't yet. Many of these features are **deferred on purpose** (we're Phase 1 with 4 riders and one township). The list exists so we know what to build when, not what to build now.

Legend:
- **✅ Built** — shipped in our codebase
- **🚧 Partial** — skeleton exists, not production-ready
- **❌ Missing** — not yet implemented

---

## A. Discovery & Search

| Feature | Zomato | Swiggy | Blinkit | Us |
|---|:-:|:-:|:-:|:-:|
| Category filter | ✅ | ✅ | ✅ | ✅ |
| Veg-only toggle | ✅ | ✅ | ✅ | ✅ |
| Text search (name, description) | ✅ | ✅ | ✅ | ✅ |
| Typo-tolerant / fuzzy search | ✅ | ✅ | ✅ | ❌ |
| Autocomplete / search suggestions | ✅ | ✅ | ✅ | ❌ |
| Sort by rating / delivery time / price | ✅ | ✅ | ✅ | ❌ |
| Filter by cuisine (N Indian / Chinese / etc.) | ✅ | ✅ | n/a | ❌ |
| "Near me" geo-ranking | ✅ | ✅ | ✅ | ❌ (moot — we only serve Magarpatta) |
| Recently viewed | ✅ | ✅ | ✅ | ❌ |
| Trending / bestsellers section | ✅ | ✅ | ✅ | ❌ |
| Restaurant ratings (★ + count) | ✅ | ✅ | n/a | ❌ |
| Dish-level ratings | ✅ | ✅ | n/a | ❌ |

---

## B. Restaurant / Shop Experience

| Feature | Zomato | Swiggy | Blinkit | Us |
|---|:-:|:-:|:-:|:-:|
| Restaurant / shop detail page | ✅ | ✅ | ✅ | 🚧 (planned) |
| Shop cover image + photo gallery | ✅ | ✅ | n/a | ❌ |
| Hours / open-closed indicator | ✅ | ✅ | ✅ | ❌ |
| Address + phone + map | ✅ | ✅ | ✅ | ❌ |
| Menu highlights / chef's special | ✅ | ✅ | ✅ | ❌ |
| Popular dishes / bestsellers per shop | ✅ | ✅ | ✅ | ❌ |
| Veg / non-veg tab per shop | ✅ | ✅ | n/a | ❌ |
| "Currently busy" indicator | ✅ | ✅ | ✅ | ❌ |

---

## C. Offers, Coupons & Loyalty

| Feature | Zomato | Swiggy | Blinkit | Us |
|---|:-:|:-:|:-:|:-:|
| Coupon codes (% off / flat / free delivery) | ✅ | ✅ | ✅ | 🚧 (Phase 1 this week) |
| Min order + max discount caps | ✅ | ✅ | ✅ | 🚧 |
| Bank offers (HDFC / ICICI 10% etc.) | ✅ | ✅ | ✅ | ❌ |
| Time-based offers (happy hour, weekday) | ✅ | ✅ | ✅ | ❌ |
| First-order bonus | ✅ | ✅ | ✅ | ❌ |
| Referral program (invite friend get ₹X) | ✅ | ✅ | ✅ | ❌ |
| Loyalty tier (Gold / One) | ✅ | ✅ | ✅ | ❌ |
| Wallet balance / cashback | ✅ | ✅ | ✅ | ❌ |
| Combo deals / buy-N-get-1 | ✅ | ✅ | ✅ | ❌ |
| Flash sales / limited-time | ✅ | ✅ | ✅ | ❌ |
| "Suggested add-ons" at cart | ✅ | ✅ | ✅ | ❌ |

---

## D. Checkout & Payment

| Feature | Zomato | Swiggy | Blinkit | Us |
|---|:-:|:-:|:-:|:-:|
| Stepwise checkout (cart → address → payment) | ✅ | ✅ | ✅ | ✅ |
| Multiple saved addresses (Home / Work / Other) | ✅ | ✅ | ✅ | 🚧 (schema supports, UI doesn't) |
| Pick address on map pin | ✅ | ✅ | ✅ | ❌ |
| Cards — Visa / Mastercard / Rupay | ✅ | ✅ | ✅ | 🚧 (demo form, no Razorpay yet) |
| UPI intent (deep-link to GPay / PhonePe) | ✅ | ✅ | ✅ | 🚧 |
| Net banking (40+ banks) | ✅ | ✅ | ✅ | 🚧 (6 in demo) |
| Cash on delivery | ✅ | ✅ | ✅ | ✅ |
| Wallet balance / cashback redemption | ✅ | ✅ | ✅ | ❌ |
| Gift cards | ✅ | ❌ | ❌ | ❌ |
| Tip the rider (optional) | ✅ | ✅ | n/a | ❌ |
| Split bill between friends | ✅ | ✅ | ❌ | ❌ |
| Saved/tokenised card (remember my card) | ✅ | ✅ | ✅ | ❌ (blocked by no-Razorpay) |
| EMI on higher cart values | ✅ | ❌ | ❌ | ❌ |

---

## E. Live Order & Tracking

| Feature | Zomato | Swiggy | Blinkit | Us |
|---|:-:|:-:|:-:|:-:|
| Status timeline (placed → accepted → etc.) | ✅ | ✅ | ✅ | ✅ |
| Real-time rider location on map | ✅ | ✅ | ✅ | 🚧 (demo bike rider on abstract map) |
| Rider photo + name + rating | ✅ | ✅ | ✅ | ❌ |
| Call rider (masked number) | ✅ | ✅ | ✅ | ❌ |
| Chat with rider | ❌ | ✅ | ❌ | ❌ |
| Chat with support | ✅ | ✅ | ✅ | ❌ |
| SMS / push / WhatsApp updates | ✅ | ✅ | ✅ | ❌ |
| ETA live updates + delay apology | ✅ | ✅ | ✅ | ❌ |
| Schedule for later / pre-order | ✅ | ✅ | ❌ | ❌ |
| Contactless delivery option | ✅ | ✅ | ✅ | ❌ |
| Delivery OTP | ✅ | ✅ | ✅ | ❌ |
| Drop photo on completion | ✅ | ✅ | ✅ | ❌ |

---

## F. Post-Order

| Feature | Zomato | Swiggy | Blinkit | Us |
|---|:-:|:-:|:-:|:-:|
| Order history list | ✅ | ✅ | ✅ | ✅ |
| Reorder (one-click repeat) | ✅ | ✅ | ✅ | ❌ |
| Rate + review restaurant | ✅ | ✅ | n/a | ❌ |
| Rate + review delivery partner | ✅ | ✅ | ✅ | ❌ |
| Upload review photos | ✅ | ✅ | n/a | ❌ |
| Missing item refund flow | ✅ | ✅ | ✅ | ❌ |
| Cold / wrong food flow | ✅ | ✅ | ❌ | ❌ |
| Refund to wallet (instant) | ✅ | ✅ | ✅ | ❌ |
| GST invoice download (PDF) | ✅ | ✅ | ✅ | ❌ |
| Issue / dispute chat | ✅ | ✅ | ✅ | ❌ |

---

## G. Account / Profile

| Feature | Zomato | Swiggy | Blinkit | Us |
|---|:-:|:-:|:-:|:-:|
| Phone OTP sign-in | ✅ | ✅ | ✅ | ✅ (Firebase) |
| Multiple saved addresses labelled | ✅ | ✅ | ✅ | 🚧 |
| Profile photo | ✅ | ✅ | ✅ | ❌ |
| Email (optional) | ✅ | ✅ | ✅ | ❌ |
| Favorites / bookmarks (shop / dish) | ✅ | ✅ | ✅ | ❌ |
| Subscription management | ✅ | ✅ | ❌ | ❌ |
| Dietary preferences stored | ✅ | ✅ | ❌ | ❌ |

---

## H. Inventory & Operations

| Feature | Zomato | Swiggy | Blinkit | Us |
|---|:-:|:-:|:-:|:-:|
| Real-time vendor inventory sync | ✅ | ✅ | ✅ | ❌ |
| Auto "out of stock" | ✅ | ✅ | ✅ | 🚧 (manual flag) |
| Vendor open/close schedule | ✅ | ✅ | ✅ | ❌ |
| Dynamic delivery fee (distance / weather / surge) | ✅ | ✅ | ✅ | ❌ (flat ₹25) |
| Allergen + nutrition info | 🚧 | 🚧 | ❌ | ❌ |
| FSSAI / licenses displayed | ✅ | ✅ | ✅ | ❌ |
| Multi-vendor single-checkout | ❌ | ❌ | ❌ | ❌ |

---

## I. Marketing & Growth

| Feature | Zomato | Swiggy | Blinkit | Us |
|---|:-:|:-:|:-:|:-:|
| Push notifications (offers, updates) | ✅ | ✅ | ✅ | ❌ |
| Email campaigns | ✅ | ✅ | ✅ | ❌ |
| In-app banners / carousels | ✅ | ✅ | ✅ | ❌ |
| Re-engagement ("you last ordered X") | ✅ | ✅ | ✅ | ❌ |
| Birthday / anniversary offers | ✅ | ✅ | ❌ | ❌ |
| ML-based recommendations | ✅ | ✅ | ✅ | ❌ |
| Personalized feed / "trending near you" | ✅ | ✅ | ✅ | ❌ |
| Referral program | ✅ | ✅ | ✅ | ❌ |

---

## J. Vendor / Rider Platforms (separate apps)

| Feature | Zomato | Swiggy | Blinkit | Us |
|---|:-:|:-:|:-:|:-:|
| Vendor app (accept / reject / OOS / menu edit) | ✅ | ✅ | ✅ | ❌ |
| Rider app (navigate / mark picked / delivered) | ✅ | ✅ | ✅ | ❌ |
| Kitchen display / POS integration | ✅ | ✅ | n/a | ❌ |
| Vendor earnings + payout dashboard | ✅ | ✅ | ✅ | ❌ |
| Rider earnings + shift dashboard | ✅ | ✅ | ✅ | ❌ |
| Rider incentive / surge tiers | ✅ | ✅ | ✅ | ❌ |
| Ratings dashboard (for vendor) | ✅ | ✅ | n/a | ❌ |

---

## K. Compliance & Safety

| Feature | Zomato | Swiggy | Blinkit | Us |
|---|:-:|:-:|:-:|:-:|
| FSSAI license badge visible | ✅ | ✅ | ✅ | ❌ |
| Packaging certification | ✅ | ✅ | ❌ | ❌ |
| Veg / non-veg dot | ✅ | ✅ | ✅ | ✅ |
| MRP displayed on packaged goods | n/a | n/a | ✅ | 🚧 (we show our price, Phase 1 fix pending) |
| Rider verified ID on drop | ✅ | ✅ | ✅ | ❌ |
| Order OTP verification on delivery | ✅ | ✅ | ✅ | ❌ |
| Photo proof of drop | ✅ | ✅ | ✅ | ❌ |
| GST-compliant invoice | ✅ | ✅ | ✅ | ❌ |

---

## L. UX Polish

| Feature | Zomato | Swiggy | Blinkit | Us |
|---|:-:|:-:|:-:|:-:|
| Skeleton loaders while fetching | ✅ | ✅ | ✅ | 🚧 (some) |
| Progressive / lazy images | ✅ | ✅ | ✅ | 🚧 |
| Pull-to-refresh (mobile) | ✅ | ✅ | ✅ | ❌ |
| Infinite scroll on long lists | ✅ | ✅ | ✅ | ❌ |
| Animated route transitions | ✅ | ✅ | ✅ | 🚧 |
| Dark mode toggle | ❌ | ❌ | ❌ | ❌ |
| Multi-language (Hindi / Marathi) | ✅ | ✅ | ✅ | ❌ (scaffolded, not wired) |
| Hamburger nav on mobile | ✅ | ✅ | ✅ | ❌ |
| Haptic feedback on actions (native app) | ✅ | ✅ | ✅ | ❌ (web only) |
| Native iOS / Android app | ✅ | ✅ | ✅ | ❌ (web first, PWA later) |

---

## Priority ladder for Phase 1 → Phase 2

**Phase 1 remaining (next 6 weeks):**
1. Coupons / promo codes — *unlocks marketing loops*
2. Restaurant / shop detail pages — *improves discovery*
3. Reorder from past order — *one of the single highest-leverage retention features*
4. Multi-address labelled (Home / Work / Other) — *small change, big convenience*
5. Push notifications (web push first)
6. Rate + review on delivered order — *feeds the rating → ranking loop*
7. Hamburger nav + mobile polish
8. GST-compliant invoice PDF
9. Vendor open/close hours
10. "Currently busy" indicator

**Phase 2 (months 3–6):**
- Real rider app (replace demo tracker)
- Vendor app (replace manual seed scripts)
- Real-time GPS tracking on Mappls
- Razorpay live checkout
- Loyalty / subscription
- Dynamic delivery fee
- ML recommendations
- Referral program
- Multi-language i18n

**Phase 3 (6+ months):**
- Gift cards, wallet, cashback economy
- EMI / corporate accounts
- Tip the rider
- Allergen / nutrition data
- Kitchen POS integrations
- Native mobile apps

---

## What we already have that's *better* than the big players

To be fair, a hyperlocal startup has advantages:

- ✅ **Strict geofence** — no "surprise out-of-zone" on delivery. Zomato/Swiggy happily take orders they can't fulfil well at the edges.
- ✅ **Address-precise building register** (259 buildings, 16 societies mapped) — Zomato's address graph is national and shallower at the building level.
- ✅ **+₹1 transparent markup** on non-MRP items — Blinkit hides margin in price; we disclose it at checkout as a line item.
- ✅ **Neighbour riders** — trust + accountability the generalists can't match.
- ✅ **Tower-level group orders** (Phase 2 planned) — structurally impossible for a 15-city player to do well.
- ✅ **Lift-aware ETA** (Phase 2 planned) — specific to our geometry.

---

*Document last updated: 2026-04-21.*
