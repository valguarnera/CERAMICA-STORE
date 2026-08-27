import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/infrastructure/database';
import { CartService } from '@/domain/services';
import { cartAddItemSchema } from '@/domain/schemas';
import { getCartSecret } from '@/presentation/lib/cart-cookie';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = cartAddItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const cookieValue = (await import('next/headers')).cookies().get('cart')?.value;
    const secret = getCartSecret();

    const db = getDatabase();
    const cartService = new CartService(db, secret);

    const cart = cookieValue ? cartService.deserialize(cookieValue) : cartService.getEmptyCart();
    const currentCart = cart ?? cartService.getEmptyCart();

    try {
      const updatedCart = await cartService.addItem(currentCart, parsed.data.productId, parsed.data.quantity);

      const response = NextResponse.json(updatedCart);
      response.cookies.set('cart', cartService.serialize(updatedCart), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'PRODUCT_NOT_FOUND') {
          return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
        }
        if (error.message === 'PRODUCT_INACTIVE') {
          return NextResponse.json({ error: 'Producto no disponible' }, { status: 400 });
        }
        if (error.message === 'INSUFFICIENT_STOCK') {
          return NextResponse.json({ error: 'Stock insuficiente' }, { status: 400 });
        }
        if (error.message === 'CART_FULL') {
          return NextResponse.json({ error: 'Carrito lleno (máx. 50 items)' }, { status: 400 });
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Cart POST error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}