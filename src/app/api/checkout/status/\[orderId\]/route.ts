import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/infrastructure/database';
import { OrderService } from '@/domain/services/order';
import { CartService } from '@/domain/services/cart';
import { getCartSecret } from '@/presentation/lib/cart-cookie';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const db = getDatabase();
    const orderService = new OrderService(db, getCartSecret());
    const order = await orderService.findById(orderId);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Also fetch payment if exists
    const payment = await db
      .selectFrom('payments')
      .selectAll()
      .where('order_id', '=', orderId)
      .executeTakeFirst();

    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        totalCents: order.totalCents,
        mpPaymentId: order.mpPaymentId,
      },
      payment: payment
        ? {
            id: payment.id,
            status: payment.status,
            statusDetail: payment.status_detail,
            mpPaymentId: payment.mp_payment_id,
          }
        : null,
    });
  } catch (error) {
    console.error('Checkout status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}