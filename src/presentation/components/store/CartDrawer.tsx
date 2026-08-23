'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatARS } from '@/presentation/lib/currency';
import { useCart } from '@/presentation/hooks/useCart';
import { X, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import { cn } from '@/presentation/lib/utils';

export function CartDrawer() {
  const { cart, itemCount, total, updateQuantity, removeItem, clearCart } = useCart();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (itemCount > 0) setOpen(true);
  }, [itemCount]);

  if (itemCount === 0 && !open) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-sm bg-card shadow-xl transition-transform lg:relative lg:max-w-none lg:shadow-none lg:bg-transparent',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-label="Carrito de compras"
      >
        <div className="flex h-full flex-col lg:border-l lg:rounded-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4 lg:hidden">
            <h2 className="text-lg font-semibold">Carrito ({itemCount})</h2>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 hover:bg-accent"
              aria-label="Cerrar carrito"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mb-2" />
                <p>Tu carrito está vacío</p>
              </div>
            ) : (
              <ul className="space-y-4" role="list" aria-label="Items del carrito">
                {cart.items.map((item) => (
                  <li key={item.productId} className="flex gap-3">
                    <Link href={`/productos/${item.productId}`} className="relative h-20 w-20 flex-shrink-0 rounded overflow-hidden">
                      {/* placeholder image - would need product image URL */}
                      <div className="flex h-full items-center justify-center bg-muted">
                        <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/productos/${item.productId}`} className="font-medium line-clamp-1 hover:underline">
                        Producto {item.productId.slice(0, 8)}
                      </Link>
                      <p className="text-sm text-muted-foreground">{formatARS(item.unitPriceCents)} c/u</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="rounded border p-1 hover:bg-accent disabled:opacity-50"
                          aria-label="Disminuir cantidad"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="rounded border p-1 hover:bg-accent"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <span className="ml-auto font-medium">{formatARS(item.quantity * item.unitPriceCents)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Eliminar item"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {cart.items.length > 0 && (
            <div className="border-t p-4 space-y-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatARS(total)}</span>
              </div>
              <Link
                href="/carrito"
                className="flex w-full items-center justify-center gap-2 rounded bg-primary px-4 py-3 text-primary-foreground hover:bg-primary/90"
              >
                <ShoppingCart className="h-5 w-5" />
                Ver carrito
              </Link>
              <button
                onClick={clearCart}
                className="flex w-full items-center justify-center gap-2 rounded border text-sm text-muted-foreground hover:bg-accent"
              >
                Vaciar carrito
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}