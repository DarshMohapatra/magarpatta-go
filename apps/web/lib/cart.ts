'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartProduct {
  id: string;
  name: string;
  priceInr: number;       // what we charge (mrp + ₹1 for non-reg, or discounted)
  mrpInr: number;         // sticker price shown to customer (post-discount if any)
  isRegulated: boolean;   // true = no markup
  unit?: string | null;
  accent?: string | null;
  glyph?: string | null;
  imageUrl?: string | null;
  vendorSlug?: string;       // preferred vendor key; falls back to vendorName
  vendorName: string;
  vendorHub?: string | null;
  /** Pre-discount MRP — non-null when an active campaign cut this item's price. */
  originalMrpInr?: number | null;
  /** Title of the campaign that's discounting this item (for the cart breakdown). */
  campaignTitle?: string | null;
  /** Campaign type (e.g. WEEKEND) — drives the coupon-style code label. */
  campaignType?: string | null;
}

export interface CartItem extends CartProduct {
  qty: number;
}

export type AddResult =
  | { ok: true }
  | { ok: false; conflict: { currentHub: string; nextHub: string; currentVendorName: string; nextVendorName: string } };

function hubKey(p: { vendorHub?: string | null; vendorName: string }): string {
  return (p.vendorHub && p.vendorHub.trim()) || p.vendorName;
}

interface CartState {
  items: CartItem[];
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  add: (p: CartProduct) => AddResult;
  replaceCartWith: (p: CartProduct) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      drawerOpen: false,
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      add: (p) => {
        const state = get();
        const existing = state.items.find((i) => i.id === p.id);
        if (existing) {
          set({
            items: state.items.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i)),
            drawerOpen: true,
          });
          return { ok: true };
        }
        // Single-hub enforcement: cart may mix vendors, but only within the
        // same hub (e.g. both Seasons Mall). Cross-hub adds are rejected.
        const current = state.items[0];
        if (current && hubKey(current) !== hubKey(p)) {
          return {
            ok: false,
            conflict: {
              currentHub: current.vendorHub ?? current.vendorName,
              nextHub: p.vendorHub ?? p.vendorName,
              currentVendorName: current.vendorName,
              nextVendorName: p.vendorName,
            },
          };
        }
        set({ items: [...state.items, { ...p, qty: 1 }], drawerOpen: true });
        return { ok: true };
      },
      replaceCartWith: (p) =>
        set({ items: [{ ...p, qty: 1 }], drawerOpen: true }),
      increment: (id) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)),
        })),
      decrement: (id) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i))
            .filter((i) => i.qty > 0),
        })),
      remove: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'mg-cart-v3' },
  ),
);

export function cartCount(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.qty, 0);
}

/** MRP-based subtotal — what the customer sees on line items. */
export function cartSubtotalMrp(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.mrpInr * i.qty, 0);
}

/** Sum of ₹1-per-unit markups across non-regulated items. */
export function cartConvenience(items: CartItem[]): number {
  return items.reduce(
    (s, i) => s + (i.isRegulated ? 0 : (i.priceInr - i.mrpInr) * i.qty),
    0,
  );
}

/** Legacy: actual-price subtotal (mrp + markup). Not shown to customer. */
export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.priceInr * i.qty, 0);
}

/** Distinct vendor names in the cart, in insertion order. */
export function cartVendors(items: CartItem[]): string[] {
  const out: string[] = [];
  for (const i of items) if (!out.includes(i.vendorName)) out.push(i.vendorName);
  return out;
}

/** The cart's locked hub (first item's hub). Null if cart empty. */
export function cartHub(items: CartItem[]): string | null {
  const first = items[0];
  return first?.vendorHub ?? first?.vendorName ?? null;
}

/**
 * Total ₹ saved across the cart from active campaign discounts. Computed
 * against the pre-discount MRP each item carried at add-time.
 */
export function cartCampaignSavings(items: CartItem[]): number {
  return items.reduce((s, i) => {
    if (!i.originalMrpInr || i.originalMrpInr <= i.mrpInr) return s;
    return s + (i.originalMrpInr - i.mrpInr) * i.qty;
  }, 0);
}

/** Any item in the cart currently riding a campaign discount? */
export function cartHasCampaignDiscount(items: CartItem[]): boolean {
  return items.some((i) => i.originalMrpInr != null && i.originalMrpInr > i.mrpInr);
}

/** The unique campaign titles in the cart, in insertion order. */
export function cartCampaignTitles(items: CartItem[]): string[] {
  const out: string[] = [];
  for (const i of items) {
    if (i.campaignTitle && !out.includes(i.campaignTitle)) out.push(i.campaignTitle);
  }
  return out;
}
