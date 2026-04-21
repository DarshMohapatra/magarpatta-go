'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartProduct {
  id: string;
  name: string;
  priceInr: number;       // what we charge (mrp + ₹1 for non-reg)
  mrpInr: number;         // sticker price shown to customer
  isRegulated: boolean;   // true = no markup
  unit?: string | null;
  accent?: string | null;
  glyph?: string | null;
  imageUrl?: string | null;
  vendorName: string;
}

export interface CartItem extends CartProduct {
  qty: number;
}

interface CartState {
  items: CartItem[];
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  add: (p: CartProduct) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      drawerOpen: false,
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      add: (p) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === p.id);
          if (existing) {
            return {
              items: state.items.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i)),
              drawerOpen: true,
            };
          }
          return { items: [...state.items, { ...p, qty: 1 }], drawerOpen: true };
        }),
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
    { name: 'mg-cart-v2' },
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
