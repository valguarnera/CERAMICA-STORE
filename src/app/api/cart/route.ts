import { NextResponse } from 'next/server';
import { getDatabase } from '@/infrastructure/database';
import { CartService } from '@/domain/services';
import { getCartSecret } from '@/presentation/lib/cart-cookie';

export async function GET() {
  try {
    const cookieValue = (await import('next/headers')).cookies().get('cart')?.value;
    const secret = getCartSecret();

    const db = getDatabase();
    const cartService = new CartService(db, secret);

    const cart = cookieValue ? cartService.deserialize(cookieValue) : cartService.getEmptyCart();

    if (cart) {
      const validated = await cartService.validateAndHydrate(cart);
      return NextResponse.json(validated.cart);
    }

    return NextResponse.json(cartService.getEmptyCart());
  } catch (error) {
    console.error('Cart GET error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const secret = getCartSecret();
    const db = getDatabase();
    const cartService = new CartService(db, secret);

    const emptyCart = cartService.clearCart();

    const response = NextResponse.json(emptyCart);
    response.cookies.delete('cart');

    return response;
  } catch (error) {
    console.error('Cart DELETE error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}