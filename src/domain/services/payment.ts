import type { Kysely } from 'kysely';
import type { Database, PaymentStatus, OrderStatus } from '@/domain/db';
import { randomUUID } from 'crypto';

export interface IPaymentGateway {
  createPreference(input: PreferenceInput): Promise<PreferenceResponse>;
  getPayment(paymentId: string): Promise<MpPayment>;
  refundPayment(paymentId: string): Promise<void>;
}

export interface PreferenceInput {
  items: PreferenceItem[];
  externalReference: string;
  backUrls: { success: string; failure: string; pending: string };
  notificationUrl: string;
  metadata: Record<string, string>;
  autoReturn?: string;
}

export interface PreferenceItem {
  id: string;
  title: string;
  unit_price: number;
  quantity: number;
  currency_id: string;
  picture_url?: string;
}

export interface PreferenceResponse {
  id: string;
  init_point: string;
}

export interface MpPayment {
  id: string;
  status: string;
  status_detail: string;
  external_reference: string;
  transaction_amount: number;
  currency_id: string;
  payment_method_id: string;
  payment_type_id: string;
  installments: number;
  payer: { email?: string; id?: string };
  date_approved?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentDomain {
  id: string;
  orderId: string;
  mpPaymentId: string;
  mpPreferenceId: string | null;
  status: PaymentStatus;
  statusDetail: string | null;
  amountCents: number;
  currency: string;
  paymentMethodId: string | null;
  paymentTypeId: string | null;
  installments: number;
  payerEmail: string | null;
  payerId: string | null;
  externalReference: string;
  rawResponse: string;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusUpdate {
  orderId: string;
  status: OrderStatus;
  mpPaymentId: string;
}

function toISO(date: Date): string {
  return date.toISOString();
}

function mapMpStatusToPayment(status: string): PaymentStatus {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'cancelled':
      return 'cancelled';
    case 'refunded':
      return 'refunded';
    case 'pending':
    case 'in_process':
    case 'in_mediation':
    default:
      return 'pending';
  }
}

function mapPaymentStatusToOrder(status: PaymentStatus): OrderStatus {
  switch (status) {
    case 'approved':
      return 'PAID';
    case 'rejected':
      return 'PENDING';
    case 'cancelled':
      return 'CANCELLED';
    case 'refunded':
      return 'REFUNDED';
    case 'pending':
    default:
      return 'PENDING';
  }
}

export class PaymentService {
  constructor(
    private db: Kysely<Database>,
    private gateway: IPaymentGateway
  ) {}

  async createPreferenceForOrder(
    orderId: string,
    items: { productId: string; title: string; unitPriceCents: number; quantity: number }[],
    baseUrl: string
  ): Promise<{ preferenceId: string; initPoint: string }> {
    const prefItems = items.map((it) => ({
      id: it.productId,
      title: it.title,
      unit_price: it.unitPriceCents / 100,
      quantity: it.quantity,
      currency_id: 'ARS',
    }));

    const response = await this.gateway.createPreference({
      items: prefItems,
      externalReference: orderId,
      backUrls: {
        success: `${baseUrl}/checkout/result?status=approved`,
        failure: `${baseUrl}/checkout/result?status=rejected`,
        pending: `${baseUrl}/checkout/result?status=pending`,
      },
      notificationUrl: `${baseUrl}/api/webhooks/mercadopago`,
      metadata: { order_id: orderId },
      autoReturn: 'approved',
    });

    return { preferenceId: response.id, initPoint: response.init_point };
  }

  async handleWebhook(
    paymentId: string,
    rawPayload: string
  ): Promise<{ orderId: string; orderStatus: OrderStatus; paymentStatus: PaymentStatus }> {
    // Idempotency check
    const existingLog = await this.db
      .selectFrom('webhooks_log')
      .select('id')
      .where('mp_resource_id', '=', paymentId)
      // @ts-expect-error SQLite boolean stored as integer
.where('processed', '=', 1)
      .executeTakeFirst();

    if (existingLog) {
      // Already processed, fetch current state
      const payment = await this.getPaymentByMpId(paymentId);
      const order = payment ? await this.getOrder(payment.orderId) : null;
      return {
        orderId: payment?.orderId ?? '',
        orderStatus: order?.status ?? 'PENDING',
        paymentStatus: payment?.status ?? 'pending',
      };
    }

    // Fetch payment from MP (source of truth)
    const mpPayment = await this.gateway.getPayment(paymentId);

    const paymentStatus = mapMpStatusToPayment(mpPayment.status);
    const orderStatus = mapPaymentStatusToOrder(paymentStatus);
    const now = toISO(new Date());

    await this.db.transaction().execute(async (trx) => {
      // Upsert payment
      const paymentIdLocal = randomUUID();
      await trx
        .insertInto('payments')
        .values({
          id: paymentIdLocal,
          order_id: mpPayment.external_reference,
          mp_payment_id: mpPayment.id,
          mp_preference_id: mpPayment.metadata?.preference_id?.toString() ?? null,
          status: paymentStatus,
          status_detail: mpPayment.status_detail,
          amount_cents: Math.round(mpPayment.transaction_amount * 100),
          currency: mpPayment.currency_id,
          payment_method_id: mpPayment.payment_method_id ?? null,
          payment_type_id: mpPayment.payment_type_id ?? null,
          installments: mpPayment.installments,
          payer_email: mpPayment.payer?.email ?? null,
          payer_id: mpPayment.payer?.id?.toString() ?? null,
          external_reference: mpPayment.external_reference,
          raw_response: JSON.stringify(mpPayment),
          paid_at: mpPayment.date_approved ?? null,
          created_at: now,
          updated_at: now,
        })
        .onConflict((oc) =>
          oc.column('mp_payment_id').doUpdateSet({
            status: paymentStatus,
            status_detail: mpPayment.status_detail,
            amount_cents: Math.round(mpPayment.transaction_amount * 100),
            payment_method_id: mpPayment.payment_method_id ?? null,
            payment_type_id: mpPayment.payment_type_id ?? null,
            installments: mpPayment.installments,
            payer_email: mpPayment.payer?.email ?? null,
            payer_id: mpPayment.payer?.id?.toString() ?? null,
            raw_response: JSON.stringify(mpPayment),
            paid_at: mpPayment.date_approved ?? null,
            updated_at: now,
          })
        )
        .execute();

      // Update order
      await trx
        .updateTable('orders')
        .set({
          status: orderStatus,
          mp_payment_id: mpPayment.id,
          updated_at: now,
        })
        .where('id', '=', mpPayment.external_reference)
        .execute();

      // Log webhook
      await trx
        .insertInto('webhooks_log')
        .values({
          id: randomUUID(),
          mp_event_type: 'payment.updated',
          mp_resource_id: mpPayment.id,
          payload: rawPayload,
          // @ts-expect-error SQLite stores boolean as integer 1/0
          processed: 1,
          created_at: now,
        })
        .execute();
    });

    return {
      orderId: mpPayment.external_reference,
      orderStatus,
      paymentStatus,
    };
  }

  async syncPayment(orderId: string): Promise<{ orderStatus: OrderStatus; paymentStatus: PaymentStatus }> {
    const order = await this.getOrder(orderId);
    if (!order || !order.mpPaymentId) {
      throw new Error('ORDER_HAS_NO_PAYMENT');
    }

    const mpPayment = await this.gateway.getPayment(order.mpPaymentId);
    const paymentStatus = mapMpStatusToPayment(mpPayment.status);
    const orderStatus = mapPaymentStatusToOrder(paymentStatus);
    const now = toISO(new Date());

    await this.db.transaction().execute(async (trx) => {
      await trx
        .updateTable('payments')
        .set({
          status: paymentStatus,
          status_detail: mpPayment.status_detail,
          amount_cents: Math.round(mpPayment.transaction_amount * 100),
          payment_method_id: mpPayment.payment_method_id ?? null,
          payment_type_id: mpPayment.payment_type_id ?? null,
          installments: mpPayment.installments,
          payer_email: mpPayment.payer?.email ?? null,
          payer_id: mpPayment.payer?.id?.toString() ?? null,
          raw_response: JSON.stringify(mpPayment),
          paid_at: mpPayment.date_approved ?? null,
          updated_at: now,
        })
        .where('mp_payment_id', '=', order.mpPaymentId)
        .execute();

      await trx
        .updateTable('orders')
        .set({ status: orderStatus, updated_at: now })
        .where('id', '=', orderId)
        .execute();

      await trx
        .insertInto('webhooks_log')
        .values({
          id: randomUUID(),
          mp_event_type: 'manual_sync',
          mp_resource_id: order.mpPaymentId as string,
          payload: JSON.stringify(mpPayment),
          // @ts-expect-error SQLite stores boolean as integer 1/0
          processed: 1,
          created_at: now,
        })
        .execute();
    });

    return { orderStatus, paymentStatus };
  }

  private async getPaymentByMpId(mpPaymentId: string): Promise<PaymentDomain | null> {
    const row = await this.db
      .selectFrom('payments')
      .selectAll()
      .where('mp_payment_id', '=', mpPaymentId)
      .executeTakeFirst();
    return row ? this.mapPayment(row) : null;
  }

  private async getOrder(orderId: string): Promise<{ id: string; status: OrderStatus; mpPaymentId: string | null } | null> {
    const row = await this.db
      .selectFrom('orders')
      .select(['id', 'status', 'mp_payment_id'])
      .where('id', '=', orderId)
      .executeTakeFirst();
    if (!row) return null;
    return {
      id: row.id,
      status: row.status as OrderStatus,
      mpPaymentId: row.mp_payment_id,
    };
  }

  private mapPayment(row: Record<string, unknown>): PaymentDomain {
    return {
      id: String(row.id),
      orderId: String(row.order_id),
      mpPaymentId: String(row.mp_payment_id),
      mpPreferenceId: row.mp_preference_id ? String(row.mp_preference_id) : null,
      status: row.status as PaymentStatus,
      statusDetail: row.status_detail ? String(row.status_detail) : null,
      amountCents: Number(row.amount_cents),
      currency: String(row.currency),
      paymentMethodId: row.payment_method_id ? String(row.payment_method_id) : null,
      paymentTypeId: row.payment_type_id ? String(row.payment_type_id) : null,
      installments: Number(row.installments),
      payerEmail: row.payer_email ? String(row.payer_email) : null,
      payerId: row.payer_id ? String(row.payer_id) : null,
      externalReference: String(row.external_reference),
      rawResponse: String(row.raw_response),
      paidAt: row.paid_at ? String(row.paid_at) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
}