import type { Kysely } from 'kysely';
import type { Database } from '@/domain/db';
import { sql } from 'kysely';
import { randomUUID } from 'crypto';

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  stock: number;
  images: string | null;
  active: boolean;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SortOption = 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | '-created_at';

export interface ProductListOptions {
  page?: number;
  pageSize?: number;
  active?: boolean;
  search?: string;
  sort?: SortOption;
}

export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class ProductService {
  constructor(private db: Kysely<Database>) {}

  async findById(id: string): Promise<Product | null> {
    const product = await this.db
      .selectFrom('products')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!product) return null;

    return this.mapProduct(product);
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const product = await this.db
      .selectFrom('products')
      .selectAll()
      .where('slug', '=', slug)
      // @ts-expect-error - Kysely expects boolean but SQLite needs integer 1
      .where('active', '=', 1)
      .executeTakeFirst();

    if (!product) return null;

    return this.mapProduct(product);
  }

  async findMany(options: ProductListOptions = {}): Promise<PaginatedProducts> {
    const { page = 1, pageSize = 12, active = true, search, sort = '-created_at' } = options;
    const offset = (page - 1) * pageSize;

    let query = this.db.selectFrom('products').selectAll();

    if (active) {
      // @ts-expect-error Kysely expects boolean but SQLite stores 0/1 integer
      query = query.where('active', '=', 1);
    }

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      // @ts-expect-error sql template returns RawBuilder<unknown>, but works at runtime
      query = query.where(sql`(lower(name) LIKE ${term} OR lower(description) LIKE ${term})`);
    }

    // Apply sorting
    switch (sort) {
      case 'price_asc':
        query = query.orderBy('price_cents', 'asc');
        break;
      case 'price_desc':
        query = query.orderBy('price_cents', 'desc');
        break;
      case 'name_asc':
        query = query.orderBy('name', 'asc');
        break;
      case 'name_desc':
        query = query.orderBy('name', 'desc');
        break;
      case '-created_at':
      default:
        query = query.orderBy('created_at', 'desc');
        break;
    }

    const [products, totalResult] = await Promise.all([
      query
        .limit(pageSize)
        .offset(offset)
        .execute(),
      query.select(({ fn }) => fn.count('id').as('count')).executeTakeFirst(),
    ]);

    const total = Number(totalResult?.count ?? 0);

    return {
      products: products.map(this.mapProduct),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getStock(productId: string): Promise<number> {
    const product = await this.db
      .selectFrom('products')
      .select('stock')
      .where('id', '=', productId)
      .executeTakeFirst();

    return product?.stock ?? 0;
  }

  async isActive(productId: string): Promise<boolean> {
    const product = await this.db
      .selectFrom('products')
      .select('active')
      .where('id', '=', productId)
      .executeTakeFirst();

    return product?.active ?? false;
  }

  private mapProduct(product: Record<string, unknown>): Product {
    return {
      id: String(product.id),
      slug: String(product.slug),
      name: String(product.name),
      description: product.description ? String(product.description) : null,
      priceCents: Number(product.price_cents),
      stock: Number(product.stock),
      images: product.images ? String(product.images) : null,
      active: Boolean(product.active),
      metadata: product.metadata ? String(product.metadata) : null,
      createdAt: String(product.created_at),
      updatedAt: String(product.updated_at),
    };
  }

  // Admin methods
  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }

  async create(input: {
    name: string;
    slug?: string;
    description?: string | null;
    priceCents: number;
    stock: number;
    images?: string[];
    active?: boolean;
    metadata?: Record<string, unknown> | null;
  }): Promise<Product> {
    const slug = input.slug && input.slug.trim() !== ''
      ? input.slug
      : ProductService.generateSlug(input.name);
    const now = new Date().toISOString();
    const id = randomUUID();

    // Ensure slug uniqueness
    const existing = await this.db
      .selectFrom('products')
      .select('id')
      .where('slug', '=', slug)
      .executeTakeFirst();
    if (existing) {
      throw new Error('SLUG_EXISTS');
    }

    await this.db
      .insertInto('products')
      .values({
        id,
        slug,
        name: input.name,
        description: input.description ?? null,
        price_cents: input.priceCents,
        stock: input.stock,
        images: input.images && input.images.length > 0 ? JSON.stringify(input.images) : '[]',
        active: ((input.active ?? true) ? 1 : 0) as unknown as boolean,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        created_at: now,
        updated_at: now,
      })
      .execute();

    const created = await this.findById(id);
    if (!created) throw new Error('CREATE_FAILED');
    return created;
  }

  async update(id: string, input: {
    name?: string;
    description?: string | null;
    priceCents?: number;
    stock?: number;
    images?: string[];
    active?: boolean;
    metadata?: Record<string, unknown> | null;
  }): Promise<Product | null> {
    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = { updated_at: now };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.priceCents !== undefined) updateData.price_cents = input.priceCents;
    if (input.stock !== undefined) updateData.stock = input.stock;
    if (input.images !== undefined) updateData.images = input.images && input.images.length > 0 ? JSON.stringify(input.images) : '[]';
    if (input.active !== undefined) updateData.active = (input.active ? 1 : 0) as unknown as boolean;
    if (input.metadata !== undefined) updateData.metadata = input.metadata ? JSON.stringify(input.metadata) : null;

    await this.db
      .updateTable('products')
      .set(updateData)
      .where('id', '=', id)
      .execute();

    return this.findById(id);
  }

  async setActive(id: string, active: boolean): Promise<Product | null> {
    const now = new Date().toISOString();
    await this.db
      .updateTable('products')
      .set({ active: (active ? 1 : 0) as unknown as boolean, updated_at: now })
      .where('id', '=', id)
      .execute();
    return this.findById(id);
  }

  // Admin list (includes inactive if active not specified)
  async adminFindMany(options: ProductListOptions & { active?: boolean | null } = {}): Promise<PaginatedProducts> {
    const { page = 1, pageSize = 20, active = null, search, sort = '-created_at' } = options;
    const offset = (page - 1) * pageSize;

    let query = this.db.selectFrom('products').selectAll();

    if (active !== null) {
      // @ts-expect-error Kysely expects boolean but SQLite stores 0/1 integer
      query = query.where('active', '=', active ? 1 : 0);
    }

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      // @ts-expect-error sql template returns RawBuilder<unknown>, but works at runtime
      query = query.where(sql`(lower(name) LIKE ${term} OR lower(description) LIKE ${term})`);
    }

    switch (sort) {
      case 'price_asc':
        query = query.orderBy('price_cents', 'asc');
        break;
      case 'price_desc':
        query = query.orderBy('price_cents', 'desc');
        break;
      case 'name_asc':
        query = query.orderBy('name', 'asc');
        break;
      case 'name_desc':
        query = query.orderBy('name', 'desc');
        break;
      case '-created_at':
      default:
        query = query.orderBy('created_at', 'desc');
        break;
    }

    const [products, totalResult] = await Promise.all([
      query.limit(pageSize).offset(offset).execute(),
      query.select(({ fn }) => fn.count('id').as('count')).executeTakeFirst(),
    ]);

    const total = Number(totalResult?.count ?? 0);

    return {
      products: products.map(this.mapProduct),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}