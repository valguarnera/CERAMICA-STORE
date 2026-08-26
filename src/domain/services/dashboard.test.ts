import { describe, it, expect, beforeEach } from 'vitest';
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from '@/domain/db';
import { DashboardService } from './dashboard';

function createTestDb(): Kysely<DatabaseType> {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = new Kysely<DatabaseType>({
    dialect: new SqliteDialect({ database: sqlite }),
  });

  const schema = `
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('ADMIN', 'CUSTOMER')),
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE products (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price_cents INTEGER NOT NULL CHECK (price_cents > 0),
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      images TEXT,
      active BOOLEAN NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE orders (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      guest_email TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED', 'REFUNDED', 'SHIPPED')),
      total_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'ARS',
      shipping_address TEXT,
      billing_address TEXT,
      notes TEXT,
      mp_preference_id TEXT,
      mp_payment_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  sqlite.exec(schema);
  return db;
}

describe('DashboardService', () => {
  let db: Kysely<DatabaseType>;
  let dashboardService: DashboardService;

  beforeEach(() => {
    db = createTestDb();
    dashboardService = new DashboardService(db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('returns zero stats for empty database', async () => {
    const stats = await dashboardService.getStats();

    expect(stats.totalProducts).toBe(0);
    expect(stats.activeProducts).toBe(0);
    expect(stats.lowStockProducts).toBe(0);
    expect(stats.totalOrders).toBe(0);
    expect(stats.pendingOrders).toBe(0);
    expect(stats.paidOrders).toBe(0);
    expect(stats.totalRevenueCents).toBe(0);
    expect(stats.totalUsers).toBe(0);
    expect(stats.adminUsers).toBe(0);
    expect(stats.recentOrders).toHaveLength(0);
  });

  it('counts products correctly', async () => {
    await db.insertInto('products').values([
      { id: 'p1', slug: 'p1', name: 'Product 1', price_cents: 1000, stock: 10, active: 1 },
      { id: 'p2', slug: 'p2', name: 'Product 2', price_cents: 2000, stock: 3, active: 1 },
      { id: 'p3', slug: 'p3', name: 'Product 3', price_cents: 3000, stock: 0, active: 0 },
    ]).execute();

    const stats = await dashboardService.getStats();

    expect(stats.totalProducts).toBe(3);
    expect(stats.activeProducts).toBe(2);
    expect(stats.lowStockProducts).toBe(1); // p2 has stock 3 < 5
  });

  it('counts orders and revenue correctly', async () => {
    const now = new Date().toISOString();
    await db.insertInto('orders').values([
      { id: 'o1', status: 'PENDING', total_cents: 10000, currency: 'ARS', created_at: now },
      { id: 'o2', status: 'PAID', total_cents: 20000, currency: 'ARS', created_at: now },
      { id: 'o3', status: 'PAID', total_cents: 30000, currency: 'ARS', created_at: now },
      { id: 'o4', status: 'CANCELLED', total_cents: 5000, currency: 'ARS', created_at: now },
    ]).execute();

    const stats = await dashboardService.getStats();

    expect(stats.totalOrders).toBe(4);
    expect(stats.pendingOrders).toBe(1);
    expect(stats.paidOrders).toBe(2);
    expect(stats.totalRevenueCents).toBe(50000); // only PAID orders
  });

  it('counts users and admins correctly', async () => {
    await db.insertInto('users').values([
      { id: 'u1', email: 'a@b.com', password_hash: 'h', role: 'ADMIN', name: 'Admin' },
      { id: 'u2', email: 'c@d.com', password_hash: 'h', role: 'CUSTOMER', name: 'Customer' },
      { id: 'u3', email: 'e@f.com', password_hash: 'h', role: 'CUSTOMER', name: 'Customer 2' },
    ]).execute();

    const stats = await dashboardService.getStats();

    expect(stats.totalUsers).toBe(3);
    expect(stats.adminUsers).toBe(1);
  });

  it('returns recent orders with user info', async () => {
    const now = new Date().toISOString();
    await db.insertInto('users').values([
      { id: 'u1', email: 'admin@test.com', password_hash: 'h', role: 'ADMIN', name: 'Admin' },
      { id: 'u2', email: 'customer@test.com', password_hash: 'h', role: 'CUSTOMER', name: 'Customer' },
    ]).execute();

    await db.insertInto('orders').values([
      { id: 'o1', user_id: 'u1', guest_email: null, status: 'PAID', total_cents: 10000, currency: 'ARS', created_at: now },
      { id: 'o2', user_id: null, guest_email: 'guest@test.com', status: 'PENDING', total_cents: 20000, currency: 'ARS', created_at: now },
    ]).execute();

    const stats = await dashboardService.getStats();

    expect(stats.recentOrders).toHaveLength(2);
    expect(stats.recentOrders[0].userEmail).toBe('admin@test.com');
    expect(stats.recentOrders[1].guestEmail).toBe('guest@test.com');
    expect(stats.recentOrders[0].totalCents).toBe(10000);
  });
});