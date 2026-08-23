import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/infrastructure/database';
import { ProductService } from '@/domain/services';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const db = getDatabase();
    const productService = new ProductService(db);

    const product = await productService.findBySlug(slug);

    if (!product || !product.active) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Product detail GET error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}