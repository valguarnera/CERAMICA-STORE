import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import type {
  IPaymentGateway,
  PreferenceInput,
  PreferenceResponse,
  MpPayment,
} from '@/domain/services/payment';

export class MercadoPagoClient implements IPaymentGateway {
  private preference: Preference;
  private payment: Payment;

  constructor() {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) throw new Error('MP_ACCESS_TOKEN not set');
    const config = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
    this.preference = new Preference(config);
    this.payment = new Payment(config);
  }

  async createPreference(input: PreferenceInput): Promise<PreferenceResponse> {
    const mpItems = input.items.map((it) => ({
      id: it.id,
      title: it.title,
      unit_price: it.unit_price,
      quantity: it.quantity,
      currency_id: it.currency_id,
      picture_url: it.picture_url,
    }));

    const pref = await this.preference.create({
      body: {
        items: mpItems,
        external_reference: input.externalReference,
        back_urls: input.backUrls,
        notification_url: input.notificationUrl,
        metadata: input.metadata,
        auto_return: input.autoReturn ?? 'approved',
      },
    });

    return {
      id: pref.id!,
      init_point: pref.init_point!,
    };
  }

  async getPayment(paymentId: string): Promise<MpPayment> {
    const mpPayment = await this.payment.get({ id: paymentId });
    return {
      id: String(mpPayment.id),
      status: String(mpPayment.status),
      status_detail: String(mpPayment.status_detail),
      external_reference: String(mpPayment.external_reference),
      transaction_amount: Number(mpPayment.transaction_amount),
      currency_id: String(mpPayment.currency_id),
      payment_method_id: String(mpPayment.payment_method_id),
      payment_type_id: String(mpPayment.payment_type_id),
      installments: Number(mpPayment.installments),
      payer: {
        email: mpPayment.payer?.email ?? undefined,
        id: mpPayment.payer?.id?.toString(),
      },
      date_approved: mpPayment.date_approved ?? undefined,
      metadata: mpPayment.metadata as Record<string, unknown> | undefined,
    };
  }

  async refundPayment(paymentId: string): Promise<void> {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) throw new Error('MP_ACCESS_TOKEN not set');
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Refund failed: ${err}`);
    }
  }
}