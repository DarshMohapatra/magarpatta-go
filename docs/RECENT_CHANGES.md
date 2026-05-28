# Magarpatta Go — Recent Changes (plain English)

> **For:** anyone who wants to know what changed lately without reading code.
> **Companion to:** `docs/FEATURES.md` (which is the full, slightly more technical map).
> **Last sync:** 2026-05-28.

All the changes below are **live on the website AND on the APK** — the APK is just a wrapper around the live site, so nothing extra had to be installed on phones.

---

## 1. The vendor no longer sees the customer's address

### What it used to be
When a customer placed an order with the fruit shop, the shop owner saw the customer's full address — building, flat number, society, even the rider's name. That's private information that vendors don't need.

### What it is now
The vendor sees only:
- **Order number** (like `Order #5B5XYZ`)
- **The items they need to prepare**
- **How much they'll be paid**
- **The delivery date and time slot**

The customer's address, name, phone number, and rider details are now visible **only on your admin dashboard** (`/admin/orders`).

### Why it matters
- Customer privacy stays protected
- Vendor still has everything they need to pack the order
- Rider details aren't leaked — the rider is your team, not the vendor's

### Where to test
Sign in as a vendor → go to "Orders" → notice each order card now says "Order #ABC123" instead of "→ Tower 4, flat 302 · Mont Vert".

---

## 2. The customer menu only shows fruits and vegetables

### What it used to be
The menu showed everything in the catalog — sweets, dairy, groceries, bakery, meat, eggs, beverages, medicines. All categories were live.

### What it is now
The customer menu shows **only "produce"** (fruits and vegetables) at launch. Bread, eggs, meat, sweets, dairy — none of them appear to customers.

**But nothing is deleted.** All the vendors and products still exist in the database. They're just hidden until you flip the switch.

### Why it matters
- Phase 1 launch is focused on what you have supply lines for (fruits + veggies)
- When you want to add bakery later, you don't have to re-create any vendors — you just tick a checkbox

### How to flip a category back on
Sign in as admin → `/admin/settings` → scroll to **"Catalog whitelist"** → tick the category you want live (e.g. **bakery**) → click **Save changes**. Customers see the new category immediately.

To switch back to "show everything", untick all the checkboxes (empty list = no filter = full catalog).

---

## 3. Big orders can skip the time slot ("Express delivery")

### What it used to be
Every customer had to pick a delivery slot — 9 AM to 11 AM, 5 PM to 7 PM, etc. Nobody could just say "deliver now".

### What it is now
If a customer's cart total is **₹1000 or more**, they see a special green card on the checkout page that says:

> **Express delivery available**
> Your order is above ₹1,000 — you can skip the slot picker and have it dispatched now.
> [Deliver now] [Pick a slot instead]

If they pick "Deliver now", the order skips the slot system entirely and goes out as an immediate dispatch.

### Why it matters
- Big-ticket orders are worth disrupting the schedule for
- Small orders stay in the slot system (saves rider trips)
- Customer makes the choice — you set the rule

### How to change the ₹1000 limit
Sign in as admin → `/admin/settings` → **"Express orders (slot bypass)"**:
- **On/Off toggle** — if you turn this off, NOBODY can use Express delivery, no matter the cart size
- **Minimum cart amount** — change ₹1000 to ₹500, ₹2000, anything you want

### Why the customer can't cheat
Even if a tech-savvy customer tries to send an "express" request with a ₹500 cart by tampering with the website code, the server checks the rule again and rejects it with a clear message.

### Where to test
Add ₹1100 worth of stuff to your cart → go to checkout → you'll see the green Express card above the slot list.

---

## 4. Vendor payouts now work like a salary slip

### What it used to be
The vendor's payouts page just showed: "you sold ₹500 worth of stuff yesterday". No real record of what was paid, when, by who, or what's still owed.

### What it is now
A proper **settlement system** like an employee payslip.

#### Every night at 12:30 AM
The system automatically:
1. Looks at every order that was DELIVERED yesterday
2. Groups them by vendor
3. Calculates: gross sales − your commission % = the amount you owe the vendor
4. Creates one "settlement row" per vendor, marked as **PAYABLE**

#### What the vendor sees (`/vendor/payouts`)
- **Payable now** — every day where you still owe them money. Shows gross, commission deducted, and net payable.
- **Paid history (last 90 days)** — record of every past payment, with the date and the UPI/UTR reference.
- **Payout destination** — their bank account name + last 4 digits + UPI ID (read-only, so they can confirm it's correct).

#### What admin sees (`/admin/finance` → **Vendor settlements** tab)
- **Payable list** — every vendor you currently owe money to, with their UPI ID and bank details ready to copy
- **Mark paid** button — click it, type the payment reference (UPI transaction id / UTR / NEFT reference), done. The row moves from "Payable" to "Paid history".
- **Paid history (last 90 days)** — chronological feed of cleared payments
- **Regenerate yesterday's settlements** button — manually rerun the daily job if needed (e.g. if you marked something delivered late)

### Why it matters
- Vendor has a clear, dated record of every payment they're owed and every one they got
- You have a clear record of who you paid, when, by which reference
- The same row is updated by the nightly job AND by your "Mark paid" click — there's no double-counting, no lost payments

### Per shift vs per day
Right now it's **per day** (one row per vendor per day). The system was built so a future "morning shift / evening shift" split is one code change away — no database migration needed.

### Important note about role permissions
- **`SUPER_ADMIN` + `OPS` + `FINANCE`** can see the settlement list
- Only **`SUPER_ADMIN` + `FINANCE`** can click "Mark paid" (so an ops admin can't accidentally mark something paid without finance authorization)

---

## 5. Wholesale vendors now see their orders

### What it used to be
When a customer ordered from a wholesale vendor (like Magarpatta Mandi), the vendor's dashboard stayed empty. The order was happening but the vendor had no idea. The rider was supposed to walk in and buy at the counter like a regular customer, but for wholesale this didn't make sense — wholesale vendors need time to weigh produce and pack.

### What it is now
**Wholesale vendors see every order in their dashboard.** They can accept it, prepare it, mark it ready — then the rider picks it up.

### How we did it
Previously the system used two delivery modes:
- "Vendor delivers themselves" (vendor sees the order)
- "Rider walks in" (vendor doesn't see anything)

Now there are **three**:
- **Vendor delivers themselves** — for cafes that have their own delivery boys
- **Vendor prepares, rider picks up** — for wholesale and most retail vendors. **This is what was missing before.**
- **Rider walks in like a customer** — only for "off-platform" vendors who aren't on the dashboard at all (like Gulab Paan Corner)

### Why it matters
- Wholesale vendors aren't surprised when the rider shows up
- They have time to weigh, pack, and label the order properly
- Off-platform stalls still work the old way (rider just walks in)

### Where to test
Sign in as a wholesale vendor → `/vendor/orders` → you'll now see orders coming in. The "Accept", "Mark Ready" buttons work normally.

---

## 6. Time slots disappear well before they start

### What it used to be
At 4:30 PM, the 5 PM – 7 PM slot was still showing up as "available". A customer could book it right up to 5 PM, even though there was zero time to dispatch a rider, drive to the shop, pick up, and deliver.

### What it is now
There's a **platform-wide minimum cutoff** — set to **60 minutes by default**. The 5 PM – 7 PM slot now disappears at **4:00 PM**, not at 5 PM.

### Why it matters
- Riders aren't blindsided by impossible-to-fulfil orders
- Vendors get enough prep time
- Customers don't get a "your order is late" experience because of a too-tight window

### How to change the 60-minute rule
Sign in as admin → `/admin/settings` → **"Minimum slot cutoff"** → change to:
- **30 minutes** (slot closes 30 min before start — tight, aggressive)
- **60 minutes** (default — comfortable)
- **120 minutes / 2 hours** (very safe, lots of prep time)
- Anything else you want

This is a **floor** — if any individual slot has its own cutoff that's longer, the longer one wins.

### Where to test
Open the customer slot picker after **4:00 PM** today. The 5-7 PM slot should be gone.

---

## 7. Vendor sees the delivery date on every order

### What it used to be
The vendor card showed `Order #ABC123 · 5 PM – 7 PM`. They couldn't tell if the slot was today, tomorrow, or three days out. On the wholesale flow where customers regularly book the next morning's slot, this was confusing.

### What it is now
The card now shows the **delivery date** in forest green right below the order number:

- **Deliver today · 5 PM – 7 PM** (when the slot is today)
- **Deliver tomorrow · 5 PM – 7 PM** (next-day bookings)
- **Deliver Wed 28 May · 5 PM – 7 PM** (anything further out)

### Why it matters
- Vendor immediately knows if it's an urgent prep or "leave it for the morning"
- No guessing, no calling support to ask "is this for today?"

### Where to test
Sign in as a vendor → `/vendor/orders` → any order with a slot will show the date line.

---

## How the APK fits in

The Android app is **just a wrapper** around the live website. Every change above happens on the APK automatically the moment we push to GitHub. No new APK file needs to be installed.

The only time you need a fresh APK build is when something **native** changes — the app icon, the splash screen, the way the app handles notifications. All the features above are website features, so the APK auto-updates them on the next refresh.

---

## Quick test checklist after this deploy

| What to test | Where to go | What you should see |
| --- | --- | --- |
| Vendor PII scrub | `/vendor/orders` (as a vendor) | "Order #ABC123" — no flat/building/society |
| Delivery date on vendor card | `/vendor/orders` | "Deliver today · 5 PM – 7 PM" line in green |
| Catalog whitelist | `/menu` (as a customer) | Only produce items, no bakery/dairy/sweets |
| Express delivery | Add ₹1100 to cart → `/checkout` | Green "Express delivery available" card |
| Slot cutoff | Customer slot picker after 4 PM | 5-7 PM slot should be gone |
| Wholesale vendor orders | `/vendor/orders` (as a wholesale vendor) | New orders appear |
| Admin settlements | `/admin/finance` → Settlements tab | (empty until tomorrow's cron, OR click "Regenerate yesterday") |
| Admin settings | `/admin/settings` | New sections: Catalog whitelist, Minimum slot cutoff, Express orders |

---

## Where every change lives in the code

| Feature | Files |
| --- | --- |
| Vendor PII scrub | `apps/web/app/api/vendor/orders/route.ts` · `apps/web/app/vendor/orders/orders-client.tsx` |
| Catalog whitelist | `apps/web/lib/settings.ts` · `apps/web/lib/menu-cache.ts` · `apps/web/app/api/catalog/products/route.ts` · `apps/web/app/api/catalog/categories/route.ts` · `apps/web/app/admin/settings/settings-client.tsx` |
| Slot bypass (Express) | `apps/web/lib/settings.ts` · `apps/web/app/checkout/page.tsx` · `apps/web/app/checkout/checkout-client.tsx` · `apps/web/app/api/orders/route.ts` |
| Slot minimum cutoff | `apps/web/lib/settings.ts` · `apps/web/lib/slots.ts` · `apps/web/app/api/orders/route.ts` |
| Settlements | `apps/web/prisma/schema.prisma` (VendorSettlement + SettlementStatus) · `apps/web/lib/settlements.ts` · `apps/web/app/api/cron/settlements/route.ts` · `apps/web/app/api/admin/settlements/route.ts` · `apps/web/app/api/admin/settlements/[id]/paid/route.ts` · `apps/web/app/api/vendor/payouts/route.ts` · `apps/web/app/vendor/payouts/payouts-client.tsx` · `apps/web/app/admin/finance/finance-client.tsx` · `apps/web/vercel.json` |
| Wholesale vendor visibility | `apps/web/app/api/vendor/orders/route.ts` · `apps/web/app/api/orders/route.ts` |
| Delivery date on vendor card | `apps/web/app/vendor/orders/orders-client.tsx` |

---

*If anything in this document doesn't match what the app actually does, the app is right — let me know and I'll fix this file.*
