'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  PackageCheck,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Productos', href: '/admin/productos', icon: Package },
  { name: 'Stock', href: '/admin/stock', icon: PackageCheck },
  { name: 'Pedidos', href: '/admin/pedidos', icon: ShoppingCart },
  { name: 'Usuarios', href: '/admin/usuarios', icon: Users },
  { name: 'Configuración', href: '/admin/configuracion', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0">
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
        <Link href="/admin" className="text-xl font-bold text-gray-900">
          CERAMICA-STORE
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}