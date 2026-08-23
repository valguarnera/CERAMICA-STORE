import { describe, it, expect, beforeEach } from 'vitest';
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from '@/domain/db';
import { OrderService } from './order';
import { CartService } from './cart';

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

const TEST_SECRET = 'test-secret-for-cart-signing';

describe('OrderService', () => {
  let db: Kysely<DatabaseType>;
  let orderService: OrderService;
  let cartService: CartService;

  beforeEach(() => {
    db = createTestDb();
    orderService = new OrderService(db, TEST_SECRET);
    cartService = new CartService(db, TEST_SECRET);
  });

  afterEach(async () => {
    await db.destroy();
  });

  async function createProduct(overrides: Partial<{
    id: string;
    stock: number;
    priceCents: number;
    active: number;
  }> = {}) {
    const id = overrides.id || 'prod-' + Math.random().toString(36).slice(2);
    await db
      .insertInto('products')
      .values({
        id,
        slug: `product-${id}`,
        name: `Product ${id}`,
        price_cents: overrides.priceCents || 10000,
        stock: overrides.stock ?? 10,
        active: overrides.active ?? 1,
      })
      .execute();
    return id;
  }

  it('crear order: order + items + stock decrement atómico', async () => {
    const productId1 = await createProduct({ id: 'p1', stock: 5, priceCents: 10000 });
    const productId2 = await createProduct({ id: 'p2', stock: 3, priceCents: 20000 });

    let cart = cartService.getEmptyCart();
    cart = await cartService.addItem(cart, productId1, 2);
    cart = await cartService.addItem(cart, productId2, 1);

    const checkoutData = {
      email: 'test@test.com',
      shippingAddress: {
        name: 'Test User',
        address: 'Test Street 123',
        city: 'Buenos Aires',
        province: 'CABA',
        postalCode: '1000',
        phone: '+54 11 1234 5678',
      },
    };

    const result = await orderService.createOrderFromCart(cart, checkoutData);

    expect(result.order.status).toBe('PENDING');
    expect(result.order.totalCents).toBe(40000); // 2*10000 + 1*20000
    expect(result.order.guestEmail).toBe('test@test.com');
    expect(result.order.userId).toBeNull();

    const stock1 = await db
      .selectFrom('products')
      .select('stock')
      .where('id', '=', 'p1')
      .executeTakeFirst();
    const stock2 = await db
      .selectFrom('products')
      .select('stock')
      .where('id', '=', 'p2')
      .executeTakeFirst();

    expect(stock1?.stock).toBe(3);
    expect(stock2?.stock).toBe(2);

    // Verificar order_items snapshot
    const items = await db
      .selectFrom('order_items')
      .selectAll()
      .where('order_id', '=', result.order.id)
      .execute();

    expect(items).toHaveLength(2);
    expect(items[0].unit_price_cents).toBe(10000);
    expect(items[0].product_name).toBe('Product p1');
    expect(items[1].unit_price_cents).toBe(20000);
    expect(items[1].product_name).toBe('Product p2');
  });

  it('crear order con usuario registrado', async () => {
    const productId = await createProduct({ id: 'p1', stock: 5, priceCents: 10000 });

    let cart = cartService.getEmptyCart();
    cart = await cartService.addItem(cart, productId, 1);

    const checkoutData = {
      email: 'user@test.com',
      shippingAddress: {
        name: 'Test User',
        address: 'Test Street 123',
        city: 'Buenos Aires',
        province: 'CABA',
        postalCode: '1000',
        phone: '+54 11 1234 5678',
      },
    };

    const userId = 'user-123';
    await db
      .insertInto('users')
      .values({
        id: userId,
        email: 'user@test.com',
        password_hash: 'hash',
        role: 'CUSTOMER',
        name: 'Test User',
      })
      .execute();

    const result = await orderService.createOrderFromCart(cart, checkoutData, userId);

    expect(result.order.userId).toBe(userId);
    expect(result.order.guestEmail).toBeNull();
  });

  it('crear order falla si stock insuficiente (concurrencia)', async () => {
    const productId = await createProduct({ id: 'p1', stock: 1, priceCents: 10000 });

    let cart = cartService.getEmptyCart();
    cart = await cartService.addItem(cart, productId, 1);

    const checkoutData = {
      email: 'test@test.com',
      shippingAddress: {
        name: 'Test User',
        address: 'Test Street 123',
        city: 'Buenos Aires',
        province: 'CABA',
        postalCode: '1000',
        phone: '+54 11 1234 5678',
      },
    };

    // Primera orden debe funcionar
    const result1 = await orderService.createOrderFromCart(cart, checkoutData);
    expect(result1.order.status).toBe('PENDING');

    // Segunda orden con mismo carrito debe fallar por stock
    await expect(orderService.createOrderFromCart(cart, checkoutData)).rejects.toThrow();
  });

  it('findById retorna order', async () => {
    const productId = await createProduct({ id: 'p1', stock: 5, priceCents: 10000 });
    let cart = cartService.getEmptyCart();
    cart = await cartService.addItem(cart, productId, 1);

    const checkoutData = {
      email: 'test@test.com',
      shippingAddress: {
        name: 'Test User',
        address: 'Test Street 123',
        city: 'Buenos Aires',
        province: 'CABA',
        postalCode: '1000',
        phone: '+54 11 1234 5678',
      },
    };

    const result = await orderService.createOrderFromCart(cart, checkoutData);
    const found = await orderService.findById(result.order.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(result.order.id);
    expect(found!.totalCents).toBe(10000);
  });

  it('findByUser retorna orders del usuario', async () => {
    const userId = 'user-123';
    await db
      .insertInto('users')
      .values({
        id: userId,
        email: 'user@test.com',
        password_hash: 'hash',
        role: 'CUSTOMER',
        name: 'Test User',
      })
      .execute();

    const productId = await createProduct({ id: 'p1', stock: 10, priceCents: 10000 });
    let cart = cartService.getEmptyCart();
    cart = await cartService.addItem(cart, productId, 1);

    const checkoutData = {
      email: 'user@test.com',
      shippingAddress: {
        name: 'Test User',
        address: 'Test Street 123',
        city: 'Buenos Aires',
        province: 'CABA',
        postalCode: '1000',
        phone: '+54 11 1234 5678',
      },
    };

    await orderService.createOrderFromCart(cart, checkoutData, userId);
    await orderService.createOrderFromCart(cart, checkoutData, userId);

    const { orders, total } = await orderService.findByUser(userId);
    expect(total).toBe(2);
    expect(orders).toHaveLength(2);
  });
});