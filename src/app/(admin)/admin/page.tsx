import { getDatabase } from '@/infrastructure/database';
import { DashboardService } from '@/domain/services';
import { StatsCards } from '@/presentation/components/admin/StatsCards';
import type { DashboardStats } from '@/domain/services/dashboard';

async function getDashboardStats(): Promise<DashboardStats> {
  const db = getDatabase();
  const dashboardService = new DashboardService(db);
  return dashboardService.getStats();
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Resumen general de la tienda
        </p>
      </div>
      <StatsCards stats={stats} />
    </div>
  );
}