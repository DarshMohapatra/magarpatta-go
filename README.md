# Magarpatta Go — Mobile Wireframes

16 SVG wireframes for the customer, vendor, and rider mobile apps. iPhone 14 Pro frame (393 × 852 px). Strictly uses the seeded catalog (Kalika Sweets / Destination Centre / Baker's Basket / Magarpatta Pharmacy / Shraddha Meats / Starbucks · Seasons) and real coupon codes.

## Files

```
customer/
  01-splash.svg              Brand splash + Get started
  02-signup-otp.svg          OTP verify (step 2 of 3)
  03-home.svg                Categories + open vendors + active campaign
  04-restaurant.svg          Kalika Sweets menu + sticky cart bar
  05-cart-checkout.svg       Items + bill + JALEBI coupon + UPI
  06-tracking.svg            Live map + rider card + status timeline

vendor/
  01-signin.svg              Phone OTP entry
  02-dashboard.svg           Pending count + GMV + active orders
  03-menu.svg                Kalika menu list (sweets section)
  04-menu-import.svg         Photo / QR / Paste with parsed-items review
  05-campaigns.svg           Live + awaiting + removal-pending cards

rider/
  01-signin.svg              Phone OTP entry
  02-dashboard.svg           On-duty toggle + new pickup card
  03-pickup.svg              Map to vendor + items to collect
  04-delivery.svg            Turn-by-turn + customer drop card
  05-earnings.svg            Weekly hero + payout + daily breakdown
```

## Importing into Figma

1. Open or create a Figma file
2. **File → Place image** (`⌘ ⇧ K` on Mac, `Ctrl ⇧ K` on Windows) — or drag the SVG straight onto the canvas
3. Each file imports as a single layer at 393 × 852 px. Drop them onto a **Frame** of the same size (`F`, then type `393` × `852`) so the device chrome lines up
4. To lay them out for review, select all imports and use **Auto Layout** (`⇧ A`) — horizontal, 80 px gap

### Editing the SVGs as native Figma layers

The drag-drop above gives you flat images. If you want every rectangle, text, and icon as an editable Figma node, install the free **html.to.design** plugin (or **SVG to Figma**), then:

1. In Figma, run the plugin
2. Drop the SVG file in
3. Each `<g>` becomes a Figma group; each `<text>` becomes editable text

## Design tokens (matches the deployed web app)

| Role | Hex |
|---|---|
| Ink (text) | `#14110c` |
| Ink soft | `#3a3530` |
| Paper (bg) | `#fffdf7` |
| Cream | `#f7efe1` |
| Forest (primary) | `#0d4a2e` |
| Forest dark | `#06311c` |
| Saffron (accent) | `#e68a17` |
| Saffron soft | `#f4b564` |
| Gold | `#c79321` |
| Terracotta (warn) | `#c64f2e` |

Type: Inter / system-ui · serif headlines use italic for the highlight word.

## Real data referenced

- **Kalika Sweets:** Hot Jalebi (200g, ₹121), Samosa (2 pcs, ₹41), Kaju Katli (200g, ₹451), Gulab Jamun (250g, ₹201), Sev Batata Puri (1 plate, ₹101), Kachori (2 pcs, ₹61), Malai Sandwich (2 pcs, ₹81)
- **Destination Centre:** Alphonso Mangoes (1 dozen, ₹480) — used for the home-screen seasonal banner
- **Coupons:** WELCOME10, SAVE50, FREEDEL, MAGARPATTA20, JALEBI (the cart screen uses JALEBI · ₹30 off)
- **Demo phones:** vendor `9000000001`, rider `8888888801` shown on signin screens
