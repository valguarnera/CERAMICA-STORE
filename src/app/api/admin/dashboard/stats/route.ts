import { NextResponse } from 'next/server';
import { getDatabase } from '@/infrastructure/database';
import { DashboardService } from '@/domain/services';

export async function GET() {
  try {
    const db = getDatabase();
    const dashboardService = new DashboardService(db);
    const stats = await dashboardService.getStats();
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}