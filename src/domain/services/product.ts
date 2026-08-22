import type { Kysely } from 'kysely';
import type { Database } from '@/domain/db';

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

export interface ProductListOptions {
  page?: number;
  pageSize?: number;
  active?: boolean;
  search?: string;
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
      .executeTakeFirst();

    if (!product) return null;

    return this.mapProduct(product);
  }

  async findMany(options: ProductListOptions = {}): Promise<PaginatedProducts> {
    const { page = 1, pageSize = 12, active = true, search } = options;
    const offset = (page - 1) * pageSize;

    let query = this.db.selectFrom('products').selectAll();

    if (active) {
      query = query.where('active', '=', true);
    }

    if (search) {
      query = query.where((eb) =>
        eb.or([
          eb('name', 'ilike', `%${search}%`),
          eb('description', 'ilike', `%${search}%`),
        ])
      );
    }

    const [products, totalResult] = await Promise.all([
      query
        .orderBy('created_at', 'desc')
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
}