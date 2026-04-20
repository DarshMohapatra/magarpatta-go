'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartProduct {
  id: string;
  name: string;
  priceInr: number;
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
    { name: 'mg-cart-v1' },
  ),
);

export function cartCount(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.qty, 0);
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.priceInr * i.qty, 0);
}
