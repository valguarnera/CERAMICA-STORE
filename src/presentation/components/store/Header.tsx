'use client';

import Link from 'next/link';
import { useCart } from '@/presentation/hooks/useCart';
import { ShoppingCart, LogOut, LayoutDashboard } from 'lucide-react';

interface UserSession {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface HeaderProps {
  user: UserSession | null;
}

export function Header({ user }: HeaderProps) {
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
          {user ? (
            <>
              <Link href="/carrito" className="hover:underline">
                Carrito
              </Link>
              <Link href="/checkout" className="hover:underline">
                Checkout
              </Link>
              {user.role === 'ADMIN' && (
                <Link href="/admin" className="hover:underline flex items-center gap-1 text-primary-600">
                  <LayoutDashboard className="h-4 w-4" />
                  Administración
                </Link>
              )}
            </>
          ) : (
            <>
              <Link href="/checkout" className="hover:underline">
                Checkout
              </Link>
              <Link href="/login" className="hover:underline">
                Iniciar sesión
              </Link>
              <Link href="/registro" className="hover:underline">
                Registrarse
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:block">{user.email}</span>
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1 text-sm text-primary-600 hover:underline"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Admin
                </Link>
              )}
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="flex items-center gap-1 text-sm text-gray-600 hover:underline">
                  <LogOut className="h-4 w-4" />
                  Salir
                </button>
              </form>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </header>
  );
}