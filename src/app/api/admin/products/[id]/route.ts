import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/infrastructure/database';
import { ProductService } from '@/domain/services';
import { productUpdateSchema } from '@/domain/schemas';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const db = getDatabase();
    const productService = new ProductService(db);
    const product = await productService.findById(params.id);

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Admin product get error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();

    // If only active field is being toggled
    if (Object.keys(body).length === 1 && 'active' in body) {
      const active = body.active;
      if (typeof active !== 'boolean') {
        return NextResponse.json({ error: 'Campo active debe ser booleano' }, { status: 400 });
      }

      const db = getDatabase();
      const productService = new ProductService(db);
      const product = await productService.setActive(params.id, active);

      if (!product) {
        return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
      }

      return NextResponse.json({ product });
    }

    // Full update
    const parsed = productUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const productService = new ProductService(db);
    const product = await productService.update(params.id, {
      name: parsed.data.name,
      description: parsed.data.description,
      priceCents: parsed.data.price_cents,
      stock: parsed.data.stock,
      images: parsed.data.images ?? undefined,
      active: parsed.data.active,
      metadata: parsed.data.metadata ?? undefined,
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Admin product update error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const db = getDatabase();
    const productService = new ProductService(db);
    const product = await productService.findById(params.id);

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    await productService.delete(params.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin product delete error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}