import type { Kysely } from 'kysely';
import type { Database, OrderStatus } from '@/domain/db';
import { randomUUID } from 'crypto';
import { CartService, type Cart } from './cart';
import { ProductService } from './product';

export interface CheckoutData {
  email: string;
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    phone: string;
  };
  billingAddress?: {
    name: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
  };
  notes?: string;
}

export interface Order {
  id: string;
  userId: string | null;
  guestEmail: string | null;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED' | 'SHIPPED';
  totalCents: number;
  currency: string;
  shippingAddress: string | null;
  billingAddress: string | null;
  notes: string | null;
  mpPreferenceId: string | null;
  mpPaymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderResult {
  order: Order;
  mpPreferenceId: string | null;
}

function toISO(date: Date): string {
  return date.toISOString();
}

export class OrderService {
  private cartService: CartService;
  private productService: ProductService;

  constructor(private db: Kysely<Database>, cartSecret: string) {
    this.cartService = new CartService(db, cartSecret);
    this.productService = new ProductService(db);
  }

  async createOrderFromCart(
    cart: Cart,
    checkoutData: CheckoutData,
    userId: string | null = null
  ): Promise<CreateOrderResult> {
    const validation = await this.cartService.validateAndHydrate(cart);

    if (!validation.valid || validation.cart.items.length === 0) {
      throw new Error('CART_INVALID');
    }

    const totalCents = this.cartService.calculateTotal(validation.cart);

    return this.db.transaction().execute(async (trx) => {
      const orderId = randomUUID();
      const now = toISO(new Date());

      await trx
        .insertInto('orders')
        .values({
          id: orderId,
          user_id: userId,
          guest_email: userId ? null : checkoutData.email,
          status: 'PENDING',
          total_cents: totalCents,
          currency: 'ARS',
          shipping_address: JSON.stringify(checkoutData.shippingAddress),
          billing_address: checkoutData.billingAddress
            ? JSON.stringify(checkoutData.billingAddress)
            : null,
          notes: checkoutData.notes ?? null,
          created_at: now,
          updated_at: now,
        })
        .execute();

      for (const item of validation.cart.items) {
        const product = await trx
          .selectFrom('products')
          .select(['id', 'name', 'slug', 'stock', 'price_cents'])
          .where('id', '=', item.productId)
          .executeTakeFirst();

        if (!product) throw new Error('PRODUCT_NOT_FOUND');

        await trx
          .insertInto('order_items')
          .values({
            id: randomUUID(),
            order_id: orderId,
            product_id: item.productId,
            quantity: item.quantity,
            unit_price_cents: item.unitPriceCents,
            product_name: product.name,
            product_slug: product.slug,
          })
          .execute();

        await trx
          .updateTable('products')
          .set({
            stock: product.stock - item.quantity,
            updated_at: now,
          })
          .where('id', '=', item.productId)
          .where('stock', '>=', item.quantity)
          .execute();
      }

      const order = await trx
        .selectFrom('orders')
        .selectAll()
        .where('id', '=', orderId)
        .executeTakeFirstOrThrow();

      return {
        order: this.mapOrder(order),
        mpPreferenceId: null,
      };
    });
  }

  async findById(id: string): Promise<Order | null> {
    const order = await this.db
      .selectFrom('orders')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!order) return null;

    return this.mapOrder(order);
  }

  async findByUser(userId: string, options?: { status?: string; page?: number; pageSize?: number }): Promise<{
    orders: Order[];
    total: number;
  }> {
    const { status, page = 1, pageSize = 10 } = options ?? {};
    const offset = (page - 1) * pageSize;

    let query = this.db.selectFrom('orders').selectAll().where('user_id', '=', userId);

    if (status) {
      query = query.where('status', '=', status as OrderStatus);
    }

    const [orders, totalResult] = await Promise.all([
      query.orderBy('created_at', 'desc').limit(pageSize).offset(offset).execute(),
      query.select(({ fn }) => fn.count('id').as('count')).executeTakeFirst(),
    ]);

    return {
      orders: orders.map(this.mapOrder),
      total: Number(totalResult?.count ?? 0),
    };
  }

  async updateMpPreferenceId(orderId: string, mpPreferenceId: string): Promise<void> {
    const now = toISO(new Date());
    await this.db
      .updateTable('orders')
      .set({ mp_preference_id: mpPreferenceId, updated_at: now })
      .where('id', '=', orderId)
      .execute();
  }

  async updateMpPaymentId(orderId: string, mpPaymentId: string): Promise<void> {
    const now = toISO(new Date());
    await this.db
      .updateTable('orders')
      .set({ mp_payment_id: mpPaymentId, updated_at: now })
      .where('id', '=', orderId)
      .execute();
  }

  async updateStatus(orderId: string, status: Order['status']): Promise<void> {
    const now = toISO(new Date());
    await this.db
      .updateTable('orders')
      .set({ status, updated_at: now })
      .where('id', '=', orderId)
      .execute();
  }

  private mapOrder(order: Record<string, unknown>): Order {
    return {
      id: String(order.id),
      userId: order.user_id ? String(order.user_id) : null,
      guestEmail: order.guest_email ? String(order.guest_email) : null,
      status: String(order.status) as Order['status'],
      totalCents: Number(order.total_cents),
      currency: String(order.currency),
      shippingAddress: order.shipping_address ? String(order.shipping_address) : null,
      billingAddress: order.billing_address ? String(order.billing_address) : null,
      notes: order.notes ? String(order.notes) : null,
      mpPreferenceId: order.mp_preference_id ? String(order.mp_preference_id) : null,
      mpPaymentId: order.mp_payment_id ? String(order.mp_payment_id) : null,
      createdAt: new Date(String(order.created_at)),
      updatedAt: new Date(String(order.updated_at)),
    };
  }
}