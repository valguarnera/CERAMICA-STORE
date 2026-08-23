'use client';

import Link from 'next/link';
import { formatARS } from '@/presentation/lib/currency';
import { useCart } from '@/presentation/hooks/useCart';
import { Plus, Minus, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';

export function CartPage() {
  const { cart, total, updateQuantity, removeItem, clearCart } = useCart();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Carrito de compras</h1>

      {cart.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <ShoppingCart className="h-16 w-16 mb-4" />
          <h2 className="mb-2 text-xl font-semibold">Tu carrito está vacío</h2>
          <Link
            href="/productos"
            className="rounded bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
          >
            Continuar comprando
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <article
                key={item.productId}
                className="flex gap-4 rounded-lg border bg-card p-4"
              >
                <Link href={`/productos/${item.productId}`} className="relative h-24 w-24 flex-shrink-0 rounded overflow-hidden">
                  <div className="flex h-full items-center justify-center bg-muted">
                    <ShoppingCart className="h-10 w-10 text-muted-foreground" />
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/productos/${item.productId}`} className="font-medium hover:underline">
                    Producto {item.productId.slice(0, 8)}
                  </Link>
                  <p className="text-sm text-muted-foreground">{formatARS(item.unitPriceCents)} c/u</p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="rounded border p-2 hover:bg-accent disabled:opacity-50"
                      aria-label="Disminuir cantidad"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="rounded border p-2 hover:bg-accent"
                      aria-label="Aumentar cantidad"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <span className="ml-auto font-medium">{formatARS(item.quantity * item.unitPriceCents)}</span>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="self-start text-muted-foreground hover:text-destructive"
                  aria-label="Eliminar item"
                >
                  <Trash2 className="h-6 w-6" />
                </button>
              </article>
            ))}
            <button
              onClick={clearCart}
              className="flex w-full items-center justify-center gap-2 rounded border text-sm text-muted-foreground hover:bg-accent"
            >
              Vaciar carrito
            </button>
          </div>

          <aside className="space-y-4 rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold">Resumen</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal ({cart.items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span>{formatARS(total)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Envío</span>
                <span>Calculado en el checkout</span>
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatARS(total)}</span>
              </div>
            </div>
            <Link
              href="/checkout"
              className="flex w-full items-center justify-center gap-2 rounded bg-primary px-4 py-3 text-primary-foreground hover:bg-primary/90"
            >
              <ShoppingCart className="h-5 w-5" />
              Iniciar checkout
            </Link>
            <Link
              href="/productos"
              className="flex w-full items-center justify-center gap-2 rounded border text-sm hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
              Seguir comprando
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}