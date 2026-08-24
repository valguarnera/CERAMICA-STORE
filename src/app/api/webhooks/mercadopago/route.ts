import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/infrastructure/database';
import { PaymentService } from '@/domain/services/payment';
import { MercadoPagoClient } from '@/infrastructure/payments/mercadopago/client';
import { verifySignature, extractPaymentId } from '@/infrastructure/payments/mercadopago/webhook-signature';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signatureHeader = request.headers.get('x-signature') ?? '';
    const requestIdHeader = request.headers.get('x-request-id') ?? '';
    const secret = process.env.MP_WEBHOOK_SECRET;

    if (!secret) {
      console.error('MP_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (!verifySignature(payload, signatureHeader, requestIdHeader, secret)) {
      console.warn('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const paymentId = extractPaymentId(payload);
    if (!paymentId) {
      return NextResponse.json({ error: 'Missing payment id' }, { status: 400 });
    }

    const db = getDatabase();
    const paymentService = new PaymentService(db, new MercadoPagoClient());

    const result = await paymentService.handleWebhook(paymentId, payload);

    return NextResponse.json({ ok: true, orderId: result.orderId, orderStatus: result.orderStatus, paymentStatus: result.paymentStatus });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}