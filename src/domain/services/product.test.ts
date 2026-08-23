import { describe, it, expect, beforeEach } from 'vitest';
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from '@/domain/db';
import { ProductService } from './product';

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

describe('ProductService', () => {
  let db: Kysely<DatabaseType>;
  let productService: ProductService;

  beforeEach(() => {
    db = createTestDb();
    productService = new ProductService(db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  async function createProducts(count: number, overrides: Partial<{
    priceCents: number;
    stock: number;
    active: number;
    name: string;
  }> = {}) {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      const id = `prod-${i}`;
      ids.push(id);
      await db.insertInto('products').values({
        id,
        slug: `product-${i}`,
        name: overrides.name || `Product ${i}`,
        price_cents: overrides.priceCents ?? 10000 + i * 1000,
        stock: overrides.stock ?? 10,
        active: overrides.active ?? 1,
        created_at: new Date(Date.now() - i * 86400000).toISOString(), // different dates
      }).execute();
    }
    return ids;
  }

  it('paginación funciona correctamente', async () => {
    await createProducts(25);

    const page1 = await productService.findMany({ page: 1, pageSize: 10 });
    expect(page1.products).toHaveLength(10);
    expect(page1.page).toBe(1);
    expect(page1.total).toBe(25);
    expect(page1.totalPages).toBe(3);

    const page2 = await productService.findMany({ page: 2, pageSize: 10 });
    expect(page2.products).toHaveLength(10);
    expect(page2.page).toBe(2);

    const page3 = await productService.findMany({ page: 3, pageSize: 10 });
    expect(page3.products).toHaveLength(5);
    expect(page3.page).toBe(3);
  });

  it('búsqueda por texto funciona (nombre y descripción)', async () => {
    await createProducts(5);
    await db.insertInto('products').values({
      id: 'special',
      slug: 'special-product',
      name: 'Cerámica Especial',
      description: 'Una descripción única para buscar',
      price_cents: 5000,
      stock: 5,
      active: 1,
    }).execute();

    const result = await productService.findMany({ search: 'especial' });
    expect(result.total).toBe(1);
    expect(result.products[0].name).toBe('Cerámica Especial');

    const resultDesc = await productService.findMany({ search: 'única' });
    expect(resultDesc.total).toBe(1);
  });

  it('ordenamiento price_asc', async () => {
    await createProducts(5, { priceCents: 5000 });
    await db.insertInto('products').values({
      id: 'cheap',
      slug: 'cheap',
      name: 'Cheap',
      price_cents: 1000,
      stock: 10,
      active: 1,
    }).execute();

    const result = await productService.findMany({ sort: 'price_asc', pageSize: 10 });
    expect(result.products[0].priceCents).toBe(1000);
  });

  it('ordenamiento price_desc', async () => {
    await createProducts(5, { priceCents: 5000 });
    await db.insertInto('products').values({
      id: 'expensive',
      slug: 'expensive',
      name: 'Expensive',
      price_cents: 20000,
      stock: 10,
      active: 1,
    }).execute();

    const result = await productService.findMany({ sort: 'price_desc', pageSize: 10 });
    expect(result.products[0].priceCents).toBe(20000);
  });

  it('ordenamiento name_asc y name_desc', async () => {
    await db.insertInto('products').values({
      id: 'a',
      slug: 'a',
      name: 'Alpha',
      price_cents: 1000,
      stock: 10,
      active: 1,
    }).execute();
    await db.insertInto('products').values({
      id: 'z',
      slug: 'z',
      name: 'Zeta',
      price_cents: 1000,
      stock: 10,
      active: 1,
    }).execute();

    const asc = await productService.findMany({ sort: 'name_asc' });
    expect(asc.products[0].name).toBe('Alpha');

    const desc = await productService.findMany({ sort: 'name_desc' });
    expect(desc.products[0].name).toBe('Zeta');
  });

  it('orden por defecto -created_at (más recientes primero)', async () => {
    const ids = await createProducts(5);
    // primer creado (i=0) tiene fecha más reciente (now)
    const result = await productService.findMany({ pageSize: 10 });
    expect(result.products[0].id).toBe(ids[0]);
  });

  it('solo productos activos por defecto', async () => {
    await createProducts(3);
    await db.insertInto('products').values({
      id: 'inactive',
      slug: 'inactive',
      name: 'Inactive',
      price_cents: 1000,
      stock: 10,
      active: 0,
    }).execute();

    const result = await productService.findMany({ active: true });
    expect(result.total).toBe(3);

    const all = await productService.findMany({ active: false });
    expect(all.total).toBe(4);
  });

  it('findBySlug retorna null si no existe o inactivo', async () => {
    await createProducts(1);
    const found = await productService.findBySlug('product-0');
    expect(found).not.toBeNull();
    expect(found?.slug).toBe('product-0');

    const notFound = await productService.findBySlug('no-existe');
    expect(notFound).toBeNull();

    // desactivar
    await db.updateTable('products').set({ active: 0 }).where('id', '=', 'prod-0').execute();
    const inactive = await productService.findBySlug('product-0');
    expect(inactive).toBeNull();
  });
});