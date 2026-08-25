import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from '@/domain/db';
import fs from 'fs';
import path from 'path';

let testSqlite: Database | null = null;

function createTestDb(): Kysely<DatabaseType> {
  testSqlite = new Database(':memory:');
  testSqlite.pragma('journal_mode = WAL');
  testSqlite.pragma('foreign_keys = ON');

  const db = new Kysely<DatabaseType>({
    dialect: new SqliteDialect({ database: testSqlite }),
  });

  const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  testSqlite.exec(sql);

  return db;
}

describe('Database Foundation', () => {
  let db: Kysely<DatabaseType>;

  beforeAll(() => {
    db = createTestDb();
  });

  afterAll(async () => {
    await db.destroy();
    if (testSqlite) {
      testSqlite.close();
      testSqlite = null;
    }
  });

  beforeEach(async () => {
    // Clean data but keep schema
    await db.deleteFrom('webhooks_log').execute();
    await db.deleteFrom('payments').execute();
    await db.deleteFrom('order_items').execute();
    await db.deleteFrom('orders').execute();
    await db.deleteFrom('sessions').execute();
    await db.deleteFrom('products').execute();
    await db.deleteFrom('users').execute();
    await db.deleteFrom('settings').execute();
  });

  it('should have all required tables', async () => {
    const tables = await db
      .selectFrom('sqlite_master')
      .select('name')
      .where('type', '=', 'table')
      .execute();

    const tableNames = tables.map(t => t.name).sort();
    expect(tableNames).toEqual([
      'order_items',
      'orders',
      'payments',
      'products',
      'sessions',
      'settings',
      'users',
      'webhooks_log',
    ]);
  });

  it('should enforce users.email UNIQUE', async () => {
    await db
      .insertInto('users')
      .values({
        id: 'u1',
        email: 'test@example.com',
        password_hash: 'hash',
        role: 'CUSTOMER',
        name: 'Test',
      })
      .execute();

    await expect(
      db
        .insertInto('users')
        .values({
          id: 'u2',
          email: 'test@example.com',
          password_hash: 'hash2',
          role: 'CUSTOMER',
          name: 'Test2',
        })
        .execute()
    ).rejects.toThrow();
  });

  it('should enforce products.slug UNIQUE', async () => {
    await db
      .insertInto('products')
      .values({
        id: 'p1',
        slug: 'producto-unico',
        name: 'Producto 1',
        price_cents: 1000,
        stock: 5,
        active: 1,
      })
      .execute();

    await expect(
      db
        .insertInto('products')
        .values({
          id: 'p2',
          slug: 'producto-unico',
          name: 'Producto 2',
          price_cents: 2000,
          stock: 3,
          active: 1,
        })
        .execute()
    ).rejects.toThrow();
  });

  it('should enforce products.stock >= 0 CHECK', async () => {
    await expect(
      db
        .insertInto('products')
        .values({
          id: 'p3',
          slug: 'producto-negativo',
          name: 'Producto Negativo',
          price_cents: 1000,
          stock: -1,
          active: 1,
        })
        .execute()
    ).rejects.toThrow();
  });

  it('should enforce products.price_cents > 0 CHECK', async () => {
    await expect(
      db
        .insertInto('products')
        .values({
          id: 'p4',
          slug: 'producto-precio-cero',
          name: 'Producto Precio Cero',
          price_cents: 0,
          stock: 10,
          active: 1,
        })
        .execute()
    ).rejects.toThrow();
  });

  it('should enforce sessions.revoked IN (0,1) CHECK', async () => {
    await db
      .insertInto('users')
      .values({
        id: 'u1',
        email: 'test@example.com',
        password_hash: 'hash',
        role: 'CUSTOMER',
        name: 'Test',
      })
      .execute();

    await expect(
      db
        .insertInto('sessions')
        .values({
          id: 's1',
          user_id: 'u1',
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          revoked: 2,
        })
        .execute()
    ).rejects.toThrow();
  });

  it('should enforce orders.status CHECK', async () => {
    await expect(
      db
        .insertInto('orders')
        .values({
          id: 'o1',
          user_id: null,
          guest_email: 'guest@example.com',
          status: 'INVALID_STATUS',
          total_cents: 1000,
          currency: 'ARS',
        })
        .execute()
    ).rejects.toThrow();
  });

  it('should enforce payments.order_id UNIQUE (1:1)', async () => {
    await db
      .insertInto('orders')
      .values({
        id: 'o1',
        user_id: null,
        guest_email: 'guest@example.com',
        status: 'PENDING',
        total_cents: 1000,
        currency: 'ARS',
      })
      .execute();

    await db
      .insertInto('payments')
      .values({
        id: 'pay1',
        order_id: 'o1',
        mp_payment_id: 'mp1',
        mp_preference_id: 'pref1',
        status: 'pending',
        amount_cents: 1000,
        currency: 'ARS',
      })
      .execute();

    await expect(
      db
        .insertInto('payments')
        .values({
          id: 'pay2',
          order_id: 'o1',
          mp_payment_id: 'mp2',
          mp_preference_id: 'pref2',
          status: 'pending',
          amount_cents: 2000,
          currency: 'ARS',
        })
        .execute()
    ).rejects.toThrow();
  });

  it('should enforce payments.mp_payment_id UNIQUE (idempotencia)', async () => {
    await db
      .insertInto('orders')
      .values({
        id: 'o1',
        user_id: null,
        guest_email: 'guest@example.com',
        status: 'PENDING',
        total_cents: 1000,
        currency: 'ARS',
      })
      .execute();

    await db
      .insertInto('payments')
      .values({
        id: 'pay1',
        order_id: 'o1',
        mp_payment_id: 'mp1',
        mp_preference_id: 'pref1',
        status: 'pending',
        amount_cents: 1000,
        currency: 'ARS',
      })
      .execute();

    await expect(
      db
        .insertInto('payments')
        .values({
          id: 'pay2',
          order_id: 'o2',
          mp_payment_id: 'mp1',
          mp_preference_id: 'pref2',
          status: 'pending',
          amount_cents: 2000,
          currency: 'ARS',
        })
        .execute()
    ).rejects.toThrow();
  });

  it('should enforce webhooks_log.mp_resource_id UNIQUE', async () => {
    await db
      .insertInto('webhooks_log')
      .values({
        id: 'w1',
        mp_event_type: 'payment.updated',
        mp_resource_id: 'mp1',
        payload: '{}',
        processed: 0,
      })
      .execute();

    await expect(
      db
        .insertInto('webhooks_log')
        .values({
          id: 'w2',
          mp_event_type: 'payment.updated',
          mp_resource_id: 'mp1',
          payload: '{}',
          processed: 0,
        })
        .execute()
    ).rejects.toThrow();
  });

  it('should enforce foreign key sessions.user_id -> users.id ON DELETE CASCADE', async () => {
    await db
      .insertInto('users')
      .values({
        id: 'u1',
        email: 'test@example.com',
        password_hash: 'hash',
        role: 'CUSTOMER',
        name: 'Test',
      })
      .execute();

    await db
      .insertInto('sessions')
      .values({
        id: 's1',
        user_id: 'u1',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        revoked: 0,
      })
      .execute();

    // Delete user should cascade delete session
    await db.deleteFrom('users').where('id', '=', 'u1').execute();

    const session = await db
      .selectFrom('sessions')
      .selectAll()
      .where('id', '=', 's1')
      .executeTakeFirst();

    expect(session).toBeUndefined();
  });

  it('should enforce foreign key order_items.order_id -> orders.id ON DELETE CASCADE', async () => {
    await db
      .insertInto('products')
      .values({
        id: 'p1',
        slug: 'producto-test',
        name: 'Producto Test',
        price_cents: 1000,
        stock: 10,
        active: 1,
      })
      .execute();

    await db
      .insertInto('orders')
      .values({
        id: 'o1',
        user_id: null,
        guest_email: 'guest@example.com',
        status: 'PENDING',
        total_cents: 1000,
        currency: 'ARS',
      })
      .execute();

    await db
      .insertInto('order_items')
      .values({
        id: 'oi1',
        order_id: 'o1',
        product_id: 'p1',
        quantity: 1,
        unit_price_cents: 1000,
        product_name: 'Prod',
        product_slug: 'prod',
      })
      .execute();

    await db.deleteFrom('orders').where('id', '=', 'o1').execute();

    const item = await db
      .selectFrom('order_items')
      .selectAll()
      .where('id', '=', 'oi1')
      .executeTakeFirst();

    expect(item).toBeUndefined();
  });

  it('should have indexes defined', async () => {
    const indexes = await db
      .selectFrom('sqlite_master')
      .select('name')
      .where('type', '=', 'index')
      .execute();

    const indexNames = indexes.map(i => i.name);
    expect(indexNames).toContain('idx_sessions_user');
    expect(indexNames).toContain('idx_sessions_expires');
    expect(indexNames).toContain('idx_products_active');
    expect(indexNames).toContain('idx_products_slug');
    expect(indexNames).toContain('idx_orders_user');
    expect(indexNames).toContain('idx_orders_status');
    expect(indexNames).toContain('idx_orders_mp_preference');
    expect(indexNames).toContain('idx_orders_mp_payment');
    expect(indexNames).toContain('idx_payments_mp_payment');
    expect(indexNames).toContain('idx_payments_order');
    expect(indexNames).toContain('idx_webhook_resource');
  });

  it('should have triggers for updated_at', async () => {
    const triggers = await db
      .selectFrom('sqlite_master')
      .select('name')
      .where('type', '=', 'trigger')
      .execute();

    const triggerNames = triggers.map(t => t.name);
    expect(triggerNames).toContain('trigger_users_updated_at');
    expect(triggerNames).toContain('trigger_products_updated_at');
    expect(triggerNames).toContain('trigger_orders_updated_at');
    expect(triggerNames).toContain('trigger_payments_updated_at');
    expect(triggerNames).toContain('trigger_settings_updated_at');
  });
});