'use client';

import Link from 'next/link';
import { useCart } from '@/presentation/hooks/useCart';
import { ShoppingCart } from 'lucide-react';

export function Header() {
  const { itemCount } = useCart();

  return (
    <header className="border-b bg-background px-4 py-3 sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="text-xl font-bold">
          CERAMICA-STORE
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          <Link href="/productos" className="hover:underline">
            Catálogo
          </Link>
          <Link href="/checkout" className="hover:underline">
            Checkout
          </Link>
        </nav>

        <Link
          href="/carrito"
          className="relative inline-flex items-center gap-2 text-sm"
          aria-label={`Carrito, ${itemCount} items`}
        >
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
              {itemCount > 99 ? '99+' : itemCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}