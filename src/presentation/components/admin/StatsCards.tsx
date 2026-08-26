'use client';

import { Package, ShoppingCart, DollarSign, Users, AlertTriangle } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  red: 'bg-red-50 text-red-700 border-red-200',
};

export function StatCard({ title, value, icon, trend, trendUp, color }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="mt-1 text-3xl font-bold">{value}</p>
          {trend && (
            <p className={`mt-1 text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
              {trend}
            </p>
          )}
        </div>
        <div className="p-3 rounded-full bg-white/50">{icon}</div>
      </div>
    </div>
  );
}

interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  totalOrders: number;
  pendingOrders: number;
  paidOrders: number;
  totalRevenueCents: number;
  totalUsers: number;
  adminUsers: number;
}

export function StatsCards({ stats }: { stats: DashboardStats }) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Productos Totales"
        value={stats.totalProducts}
        icon={<Package className="h-8 w-8" />}
        color="blue"
      />
      <StatCard
        title="Productos Activos"
        value={stats.activeProducts}
        icon={<Package className="h-8 w-8" />}
        trend={`${stats.lowStockProducts} con stock bajo`}
        trendUp={false}
        color="green"
      />
      <StatCard
        title="Pedidos Pendientes"
        value={stats.pendingOrders}
        icon={<ShoppingCart className="h-8 w-8" />}
        color="yellow"
      />
      <StatCard
        title="Ingresos Totales"
        value={formatCurrency(stats.totalRevenueCents)}
        icon={<DollarSign className="h-8 w-8" />}
        color="purple"
      />
      <StatCard
        title="Usuarios Registrados"
        value={stats.totalUsers}
        icon={<Users className="h-8 w-8" />}
        color="blue"
      />
      <StatCard
        title="Órdenes Pagadas"
        value={stats.paidOrders}
        icon={<ShoppingCart className="h-8 w-8" />}
        color="green"
      />
      <StatCard
        title="Stock Bajo (< 5)"
        value={stats.lowStockProducts}
        icon={<AlertTriangle className="h-8 w-8" />}
        trend={stats.lowStockProducts > 0 ? 'Requiere atención' : 'OK'}
        trendUp={stats.lowStockProducts === 0}
        color={stats.lowStockProducts > 0 ? 'red' : 'green'}
      />
      <StatCard
        title="Administradores"
        value={stats.adminUsers}
        icon={<Users className="h-8 w-8" />}
        color="purple"
      />
    </div>
  );
}