"use client";

// Cart state (Zustand, persisted in the browser). When Medusa is connected, these actions
// call its Store API cart endpoints instead; the components keep the same interface.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { lineUnitPrice } from "@/lib/pricing";

export type CartItem = {
  id: string;
  slug: string;
  title: string;
  colorId: string;
  colorName: string;
  size: string;
  qty: number;
  /** Catalog price per piece before bulk discount; the line price is derived (see lineUnitPrice) */
  basePrice: number;
  /** Small JPEG of the customized product (studio items) */
  preview?: string;
  /** Saved studio design (logos, text, positions), used to render print files after ordering */
  design?: unknown;
  /** MongoDB id of the saved studio design */
  designId?: string;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "id">) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((s) => {
          // Same plain product + color + size: just increase the quantity
          const same =
            !item.design &&
            s.items.find(
              (i) =>
                !i.design &&
                i.slug === item.slug &&
                i.colorId === item.colorId &&
                i.size === item.size
            );
          if (same) return { items: s.items.map((i) => (i === same ? { ...i, qty: i.qty + item.qty } : i)) };
          return { items: [...s.items, { ...item, id: crypto.randomUUID() }] };
        }),
      setQty: (id, qty) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i)) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "cottson-cart",
      version: 2,
      // Carts saved before pricing moved to basePrice can't be priced reliably; start fresh
      migrate: () => ({ items: [] }),
    }
  )
);

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.qty, 0);
/** Per-piece price for a line, recalculated whenever its quantity changes */
export const unitPriceOf = (i: CartItem) => lineUnitPrice(i.basePrice, i.qty, !!i.designId);
export const cartTotal = (items: CartItem[]) => items.reduce((n, i) => n + i.qty * unitPriceOf(i), 0);
