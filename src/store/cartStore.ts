import { create } from 'zustand';
import type { SaleItem } from '@/domain/sales/types';
import type { Cents } from '@/domain/shared/money';

interface CartState {
  items: SaleItem[];
  addItem: (item: SaleItem) => void;
  setQty: (variantId: string, qty: number) => void;
  setDiscount: (variantId: string, discountCents: Cents) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
}

/** Estado de UI do carrinho. Regras de negócio ficam em domain/ e application/. */
export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (item) =>
    set((s) => {
      const existing = s.items.find((i) => i.variantId === item.variantId);
      if (!existing) return { items: [...s.items, item] };
      return {
        items: s.items.map((i) =>
          i.variantId === item.variantId ? { ...i, qty: i.qty + item.qty } : i,
        ),
      };
    }),
  setQty: (variantId, qty) =>
    set((s) => ({
      items: s.items.map((i) => (i.variantId === variantId ? { ...i, qty } : i)),
    })),
  setDiscount: (variantId, discountCents) =>
    set((s) => ({
      items: s.items.map((i) => (i.variantId === variantId ? { ...i, discountCents } : i)),
    })),
  removeItem: (variantId) =>
    set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId) })),
  clear: () => set({ items: [] }),
}));
