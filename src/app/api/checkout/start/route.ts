import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/infrastructure/database';
import { OrderService } from '@/domain/services/order';
import { PaymentService } from '@/domain/services/payment';
import { MercadoPagoClient } from '@/infrastructure/payments/mercadopago/client';
import { CartService } from '@/domain/services/cart';
import { checkoutSchema } from '@/domain/schemas';
import { getCartSecret } from '@/presentation/lib/cart-cookie';
import { rateLimit } from '@/presentation/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit 10/min per session
    const sessionId = request.cookies.get('session_id')?.value ?? 'anon';
    const rl = rateLimit(`checkout:${sessionId}`, 10, 60000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Demasiados intentos. Intente más tarde.' }, { status: 429, headers: rl.headers });
    }

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400, headers: rl.headers });
    }

    // Read cart cookie
    const cookieValue = (await import('next/headers')).cookies().get('cart')?.value;
    const secret = getCartSecret();
    const db = getDatabase();
    const cartService = new CartService(db, secret);
    const cart = cookieValue ? cartService.deserialize(cookieValue) : cartService.getEmptyCart();
    const currentCart = cart ?? cartService.getEmptyCart();

    // Validate and hydrate cart
    const validation = await cartService.validateAndHydrate(currentCart);
    if (!validation.valid || validation.cart.items.length === 0) {
      return NextResponse.json({ error: 'Carrito inválido o vacío' }, { status: 400, headers: rl.headers });
    }

    const orderService = new OrderService(db, secret);
    const paymentService = new PaymentService(db, new MercadoPagoClient());

    // For now treat as guest (no user session resolution in this endpoint)
    const userId = null;

    try {
      const result = await orderService.createOrderFromCart(validation.cart, parsed.data, userId);

      // Create Mercado Pago preference
      const items = validation.cart.items.map((it) => ({
        productId: it.productId,
        title: it.productId, // we could fetch product name, but okay
        unitPriceCents: it.unitPriceCents,
        quantity: it.quantity,
      }));

      const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
      const { preferenceId, initPoint } = await paymentService.createPreferenceForOrder(
        result.order.id,
        items,
        baseUrl
      );

      await orderService.updateMpPreferenceId(result.order.id, preferenceId);

      // Clear cart cookie
      const response = NextResponse.json({ init_point: initPoint, preference_id: preferenceId, orderId: result.order.id }, { status: 201, headers: rl.headers });
      response.cookies.delete('cart');
      return response;
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'CART_INVALID') return NextResponse.json({ error: 'Carrito inválido' }, { status: 400, headers: rl.headers });
        if (err.message === 'PRODUCT_NOT_FOUND') return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404, headers: rl.headers });
        if (err.message === 'INSUFFICIENT_STOCK') return NextResponse.json({ error: 'Stock insuficiente' }, { status: 409, headers: rl.headers });
      }
      throw err;
    }
  } catch (error) {
    console.error('Checkout start error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}