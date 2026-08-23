'use client';

import { create } from 'zustand';
import type { Cart } from '@/domain/services/cart';

interface CartState {
  cart: Cart;
  hydrate: (cart: Cart) => void;
  addItem: (productId: string, quantity: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  itemCount: number;
  total: number;
}

const API_BASE = '';

async function mutateCart(
  method: 'POST' | 'PATCH' | 'DELETE',
  productId: string | null,
  body?: Record<string, unknown>
): Promise<Cart> {
  const url = productId
    ? `${API_BASE}/api/cart/items/${productId}`
    : `${API_BASE}/api/cart/items`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error en la operación');
  }
  return res.json();
}

export const useCart = create<CartState>()(
  (set, get) => ({
    cart: { version: 1, items: [] },

    hydrate: (cart: Cart) => set({ cart }),

    addItem: async (productId: string, quantity: number) => {
      const updated = await mutateCart('POST', null, { productId, quantity });
      set({ cart: updated });
    },

    updateQuantity: async (productId: string, quantity: number) => {
      if (quantity <= 0) {
        await get().removeItem(productId);
        return;
      }
      const updated = await mutateCart('PATCH', productId, { quantity });
      set({ cart: updated });
    },

    removeItem: async (productId: string) => {
      const updated = await mutateCart('DELETE', productId);
      set({ cart: updated });
    },

    clearCart: async () => {
      await fetch(`${API_BASE}/api/cart`, { method: 'DELETE' });
      set({ cart: { version: 1, items: [] } });
    },

    get itemCount() {
      return get().cart.items.reduce((sum, item) => sum + item.quantity, 0);
    },

    get total() {
      return get().cart.items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
    },
  })
);