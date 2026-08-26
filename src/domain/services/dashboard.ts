import type { Kysely } from 'kysely';
import type { Database } from '@/domain/db';

export interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  totalOrders: number;
  pendingOrders: number;
  paidOrders: number;
  totalRevenueCents: number;
  totalUsers: number;
  adminUsers: number;
  recentOrders: Array<{
    id: string;
    status: string;
    totalCents: number;
    createdAt: string;
    userEmail: string | null;
    guestEmail: string | null;
  }>;
}

export class DashboardService {
  constructor(private db: Kysely<Database>) {}

  async getStats(): Promise<DashboardStats> {
    const [
      productsResult,
      ordersResult,
      usersResult,
      recentOrdersResult,
    ] = await Promise.all([
      this.getProductStats(),
      this.getOrderStats(),
      this.getUserStats(),
      this.getRecentOrders(),
    ]);

    return {
      ...productsResult,
      ...ordersResult,
      ...usersResult,
      recentOrders: recentOrdersResult,
    };
  }

  private async getProductStats(): Promise<{
    totalProducts: number;
    activeProducts: number;
    lowStockProducts: number;
  }> {
    const total = await this.db
      .selectFrom('products')
      .select(({ fn }) => fn.count('id').as('count'))
      .executeTakeFirst();

    const active = await this.db
      .selectFrom('products')
      .select(({ fn }) => fn.count('id').as('count'))
      // @ts-expect-error - Kysely expects boolean but SQLite needs integer 1
      .where('active', '=', 1)
      .executeTakeFirst();

    const lowStock = await this.db
      .selectFrom('products')
      .select(({ fn }) => fn.count('id').as('count'))
      // @ts-expect-error - Kysely expects boolean but SQLite needs integer 1
      .where('active', '=', 1)
      .where('stock', '<', 5)
      .executeTakeFirst();

    return {
      totalProducts: Number(total?.count ?? 0),
      activeProducts: Number(active?.count ?? 0),
      lowStockProducts: Number(lowStock?.count ?? 0),
    };
  }

  private async getOrderStats(): Promise<{
    totalOrders: number;
    pendingOrders: number;
    paidOrders: number;
    totalRevenueCents: number;
  }> {
    const total = await this.db
      .selectFrom('orders')
      .select(({ fn }) => fn.count('id').as('count'))
      .executeTakeFirst();

    const pending = await this.db
      .selectFrom('orders')
      .select(({ fn }) => fn.count('id').as('count'))
      .where('status', '=', 'PENDING')
      .executeTakeFirst();

    const paid = await this.db
      .selectFrom('orders')
      .select(({ fn }) => fn.count('id').as('count'))
      .where('status', '=', 'PAID')
      .executeTakeFirst();

    const revenue = await this.db
      .selectFrom('orders')
      .select(({ fn }) => fn.sum('total_cents').as('sum'))
      .where('status', '=', 'PAID')
      .executeTakeFirst();

    return {
      totalOrders: Number(total?.count ?? 0),
      pendingOrders: Number(pending?.count ?? 0),
      paidOrders: Number(paid?.count ?? 0),
      totalRevenueCents: Number(revenue?.sum ?? 0),
    };
  }

  private async getUserStats(): Promise<{
    totalUsers: number;
    adminUsers: number;
  }> {
    const total = await this.db
      .selectFrom('users')
      .select(({ fn }) => fn.count('id').as('count'))
      .executeTakeFirst();

    const admin = await this.db
      .selectFrom('users')
      .select(({ fn }) => fn.count('id').as('count'))
      .where('role', '=', 'ADMIN')
      .executeTakeFirst();

    return {
      totalUsers: Number(total?.count ?? 0),
      adminUsers: Number(admin?.count ?? 0),
    };
  }

  private async getRecentOrders(): Promise<DashboardStats['recentOrders']> {
    const orders = await this.db
      .selectFrom('orders')
      .leftJoin('users', 'orders.user_id', 'users.id')
      .select([
        'orders.id',
        'orders.status',
        'orders.total_cents',
        'orders.created_at',
        'users.email',
        'orders.guest_email',
      ])
      .orderBy('orders.created_at', 'desc')
      .limit(5)
      .execute();

    return orders.map((o) => ({
      id: String(o.id),
      status: String(o.status),
      totalCents: Number(o.total_cents),
      createdAt: String(o.created_at),
      userEmail: o.email ? String(o.email) : null,
      guestEmail: o.guest_email ? String(o.guest_email) : null,
    }));
  }
}