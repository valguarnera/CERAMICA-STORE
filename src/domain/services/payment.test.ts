import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from '@/domain/db';
import { PaymentService } from './payment';

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
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      revoked BOOLEAN DEFAULT 0 CHECK (revoked IN (0, 1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0),
      product_name TEXT NOT NULL,
      product_slug TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    CREATE TABLE payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL UNIQUE,
      mp_payment_id TEXT UNIQUE,
      mp_preference_id TEXT,
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
      status_detail TEXT,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'ARS',
      payment_method_id TEXT,
      payment_type_id TEXT,
      installments INTEGER DEFAULT 1,
      payer_email TEXT,
      payer_id TEXT,
      external_reference TEXT,
      raw_response TEXT,
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
    CREATE TABLE webhooks_log (
      id TEXT PRIMARY KEY,
      mp_event_type TEXT NOT NULL,
      mp_resource_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      processed BOOLEAN DEFAULT 0 CHECK (processed IN (0, 1)),
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX idx_webhook_resource ON webhooks_log(mp_resource_id);
    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  sqlite.exec(schema);
  return db;
}

// Mock gateway
const mockMpPayment = {
  id: 'mp-123',
  status: 'approved',
  status_detail: 'accredited',
  external_reference: 'order-1',
  transaction_amount: 100.5,
  currency_id: 'ARS',
  payment_method_id: 'visa',
  payment_type_id: 'credit_card',
  installments: 1,
  payer: { email: 'test@test.com', id: 'payer-1' },
  date_approved: new Date().toISOString(),
  metadata: { order_id: 'order-1' },
};

const mockGateway = {
  createPreference: vi.fn().mockResolvedValue({ id: 'pref-1', init_point: 'https://mp.com/init' }),
  getPayment: vi.fn().mockResolvedValue(mockMpPayment),
  refundPayment: vi.fn().mockResolvedValue(undefined),
};

describe('PaymentService', () => {
  let db: Kysely<DatabaseType>;
  let paymentService: PaymentService;

  beforeEach(() => {
    db = createTestDb();
    paymentService = new PaymentService(db, mockGateway as any);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('creates preference and returns init_point', async () => {
    const result = await paymentService.createPreferenceForOrder('order-1', [
      { productId: 'p1', title: 'Prod', unitPriceCents: 10000, quantity: 2 },
    ], 'http://localhost:3000');

    expect(result.preferenceId).toBe('pref-1');
    expect(result.initPoint).toBe('https://mp.com/init');
    expect(mockGateway.createPreference).toHaveBeenCalled();
  });

  it('handles webhook idempotency', async () => {
    // Create order first
    await db.insertInto('orders').values({
      id: 'order-1',
      user_id: null,
      guest_email: 'test@test.com',
      status: 'PENDING',
      total_cents: 10000,
      currency: 'ARS',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).execute();

    // First call
    await paymentService.handleWebhook('mp-123', JSON.stringify({ data: { id: 'mp-123' } }));
    // Second call should not duplicate
    const result2 = await paymentService.handleWebhook('mp-123', JSON.stringify({ data: { id: 'mp-123' } }));
    expect(result2.paymentStatus).toBe('approved');
    // getPayment called only once due to idempotency
    expect(mockGateway.getPayment).toHaveBeenCalledTimes(1);
  });

  it('maps approved to PAID', async () => {
    // Create order first
    await db.insertInto('orders').values({
      id: 'order-1',
      user_id: null,
      guest_email: 'test@test.com',
      status: 'PENDING',
      total_cents: 10000,
      currency: 'ARS',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).execute();

    const res = await paymentService.handleWebhook('mp-123', JSON.stringify({ data: { id: 'mp-123' } }));
    expect(res.orderStatus).toBe('PAID');
    expect(res.paymentStatus).toBe('approved');
  });
});