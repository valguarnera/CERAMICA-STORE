'use client';

import { Menu, User, LogOut, Store } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

interface HeaderProps {
  userRole: string;
}

export function Header({ userRole }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-8 lg:ml-64">
      <button
        type="button"
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
        aria-expanded={mobileMenuOpen}
      >
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <Link
        href="/"
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        title="Ver tienda"
      >
        <Store className="h-4 w-4" />
        <span className="hidden sm:inline">Ver tienda</span>
      </Link>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
          <User className="h-4 w-4" aria-hidden="true" />
          <span className="font-medium capitalize">{userRole.toLowerCase()}</span>
        </div>

        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-label="User menu"
            aria-expanded={userMenuOpen}
          >
            <User className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:block text-sm font-medium text-gray-700">Admin</span>
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setUserMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-gray-200 focus:outline-none">
                <div className="py-1">
                  <form action="/api/auth/logout" method="POST">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Cerrar sesión
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}