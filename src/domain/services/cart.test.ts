import { describe, it, expect, beforeEach } from 'vitest';
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from '@/domain/db';
import { CartService } from './cart';
import { ProductService } from './product';
import { cartAddItemSchema } from '@/domain/schemas';

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

describe('CartService', () => {
  let db: Kysely<DatabaseType>;
  let cartService: CartService;
  let productService: ProductService;

  beforeEach(() => {
    db = createTestDb();
    cartService = new CartService(db, TEST_SECRET);
    productService = new ProductService(db);
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

  it('agregar item valida stock y precio', async () => {
    const productId = await createProduct({ stock: 5, priceCents: 1000 });
    const cart = cartService.getEmptyCart();

    const updatedCart = await cartService.addItem(cart, productId, 3);

    expect(updatedCart.items).toHaveLength(1);
    expect(updatedCart.items[0].quantity).toBe(3);
    expect(updatedCart.items[0].unitPriceCents).toBe(1000);
    expect(updatedCart.version).toBe(2);
  });

  it('no permite agregar más que stock', async () => {
    const productId = await createProduct({ stock: 2, priceCents: 1000 });
    const cart = cartService.getEmptyCart();

    await expect(cartService.addItem(cart, productId, 3)).rejects.toThrow('INSUFFICIENT_STOCK');
  });

  it('suma cantidades si producto ya en carrito', async () => {
    const productId = await createProduct({ stock: 10, priceCents: 1000 });
    let cart = cartService.getEmptyCart();

    cart = await cartService.addItem(cart, productId, 2);
    cart = await cartService.addItem(cart, productId, 3);

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(5);
    expect(cart.version).toBe(3);
  });

  it('actualizar cantidad valida stock', async () => {
    const productId = await createProduct({ stock: 5, priceCents: 1000 });
    let cart = cartService.getEmptyCart();

    cart = await cartService.addItem(cart, productId, 2);
    cart = await cartService.updateQuantity(cart, productId, 4);

    expect(cart.items[0].quantity).toBe(4);
  });

  it('actualizar cantidad a 0 elimina item', async () => {
    const productId = await createProduct({ stock: 10, priceCents: 1000 });
    let cart = cartService.getEmptyCart();

    cart = await cartService.addItem(cart, productId, 2);
    cart = await cartService.updateQuantity(cart, productId, 0);

    expect(cart.items).toHaveLength(0);
  });

  it('eliminar item funciona', async () => {
    const productId = await createProduct({ stock: 10, priceCents: 1000 });
    let cart = cartService.getEmptyCart();

    cart = await cartService.addItem(cart, productId, 2);
    cart = cartService.removeItem(cart, productId);

    expect(cart.items).toHaveLength(0);
  });

  it('limpiar carrito funciona', async () => {
    const productId = await createProduct({ stock: 10, priceCents: 1000 });
    let cart = cartService.getEmptyCart();

    cart = await cartService.addItem(cart, productId, 2);
    cart = cartService.clearCart();

    expect(cart.items).toHaveLength(0);
    expect(cart.version).toBe(1);
  });

  it('calcular total funciona correctamente', async () => {
    const productId1 = await createProduct({ id: 'p1', stock: 10, priceCents: 15000 });
    const productId2 = await createProduct({ id: 'p2', stock: 10, priceCents: 25000 });
    let cart = cartService.getEmptyCart();

    cart = await cartService.addItem(cart, productId1, 3);
    cart = await cartService.addItem(cart, productId2, 1);

    const total = cartService.calculateTotal(cart);
    expect(total).toBe(70000); // 3*15000 + 1*25000
  });

  it('serializar y deserializar carrito funciona', async () => {
    const productId = await createProduct({ stock: 10, priceCents: 1000 });
    let cart = cartService.getEmptyCart();

    cart = await cartService.addItem(cart, productId, 2);

    const serialized = cartService.serialize(cart);
    const deserialized = cartService.deserialize(serialized);

    expect(deserialized).not.toBeNull();
    expect(deserialized!.items).toHaveLength(1);
    expect(deserialized!.items[0].quantity).toBe(2);
  });

  it('deserializar carrito manipulado falla', async () => {
    const productId = await createProduct({ stock: 10, priceCents: 1000 });
    let cart = cartService.getEmptyCart();

    cart = await cartService.addItem(cart, productId, 2);
    const serialized = cartService.serialize(cart);

    // Manipular la firma
    const manipulated = serialized.slice(0, -1) + 'x';
    const deserialized = cartService.deserialize(manipulated);

    expect(deserialized).toBeNull();
  });

  it('validar y hidratar carrito detecta productos inactivos', async () => {
    const productId = await createProduct({ stock: 10, priceCents: 1000, active: 1 });
    let cart = cartService.getEmptyCart();

    cart = await cartService.addItem(cart, productId, 2);

    // Desactivar producto
    await db
      .updateTable('products')
      .set({ active: 0 })
      .where('id', '=', productId)
      .execute();

    const result = await cartService.validateAndHydrate(cart);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('ya no está disponible');
    expect(result.cart.items).toHaveLength(0);
  });

  it('validar y hidratar carrito ajusta stock si bajó', async () => {
    const productId = await createProduct({ stock: 10, priceCents: 1000 });
    let cart = cartService.getEmptyCart();

    cart = await cartService.addItem(cart, productId, 5);

    // Reducir stock
    await db
      .updateTable('products')
      .set({ stock: 3 })
      .where('id', '=', productId)
      .execute();

    const result = await cartService.validateAndHydrate(cart);

    expect(result.valid).toBe(false);
    expect(result.cart.items[0].quantity).toBe(3);
  });

  it('precio en carrito es snapshot al agregar', async () => {
    const productId = await createProduct({ stock: 10, priceCents: 1000 });
    let cart = cartService.getEmptyCart();

    cart = await cartService.addItem(cart, productId, 2);
    expect(cart.items[0].unitPriceCents).toBe(1000);

    // Cambiar precio en BD
    await db
      .updateTable('products')
      .set({ price_cents: 2000 })
      .where('id', '=', productId)
      .execute();

    // El precio en carrito no cambia
    expect(cart.items[0].unitPriceCents).toBe(1000);
  });

  it('máximo 50 items distintos', async () => {
    let cart = cartService.getEmptyCart();

    for (let i = 0; i < 50; i++) {
      const productId = await createProduct({ id: `prod-${i}`, stock: 10, priceCents: 1000 });
      cart = await cartService.addItem(cart, productId, 1);
    }

    expect(cart.items).toHaveLength(50);

    const productId51 = await createProduct({ id: 'prod-51', stock: 10, priceCents: 1000 });
    await expect(cartService.addItem(cart, productId51, 1)).rejects.toThrow('CART_FULL');
  });

  it('cliente no puede controlar el precio del producto (schema sin unitPriceCents)', () => {
    const payload = {
      productId: '123e4567-e89b-12d3-a456-426614174000',
      quantity: 2,
      unitPriceCents: 999, // intento de manipular precio
    };
    const result = cartAddItemSchema.safeParse(payload);
    expect(result.success).toBe(true);
    // unitPriceCents debe ser ignorado / no estar en data
    expect((result.data as any).unitPriceCents).toBeUndefined();
  });

  it('precio en carrito es snapshot del servidor y no del cliente', async () => {
    const productId = await createProduct({ stock: 10, priceCents: 1000 });
    const cart = cartService.getEmptyCart();

    const updatedCart = await cartService.addItem(cart, productId, 2);
    // El precio viene del producto en BD (1000), no del request
    expect(updatedCart.items[0].unitPriceCents).toBe(1000);
  });
});