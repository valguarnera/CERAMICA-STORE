import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/infrastructure/database';
import { CartService } from '@/domain/services';
import { getCartSecret } from '@/presentation/lib/cart-cookie';
import { z } from 'zod';

const quantitySchema = z.object({
  quantity: z.number().int(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const body = await request.json();
    const parsed = quantitySchema.safeParse(body);

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
      const updatedCart = await cartService.updateQuantity(currentCart, productId, parsed.data.quantity);

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
        if (error.message === 'INSUFFICIENT_STOCK') {
          return NextResponse.json({ error: 'Stock insuficiente' }, { status: 400 });
        }
        if (error.message === 'ITEM_NOT_IN_CART') {
          return NextResponse.json({ error: 'Item no está en el carrito' }, { status: 404 });
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Cart PATCH error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const cookieValue = (await import('next/headers')).cookies().get('cart')?.value;
    const secret = getCartSecret();

    const db = getDatabase();
    const cartService = new CartService(db, secret);

    const cart = cookieValue ? cartService.deserialize(cookieValue) : cartService.getEmptyCart();
    const currentCart = cart ?? cartService.getEmptyCart();

    const updatedCart = cartService.removeItem(currentCart, productId);

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
    console.error('Cart DELETE item error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}