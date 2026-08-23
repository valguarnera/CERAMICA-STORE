import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/infrastructure/database';
import { ProductService } from '@/domain/services';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    const q = searchParams.get('q') || undefined;
    const sort = searchParams.get('sort') as
      | 'price_asc'
      | 'price_desc'
      | 'name_asc'
      | 'name_desc'
      | '-created_at'
      | null;

    const db = getDatabase();
    const productService = new ProductService(db);

    const result = await productService.findMany({
      page,
      pageSize: limit,
      active: true,
      search: q,
      sort: sort || '-created_at',
    });

    return NextResponse.json({
      data: result.products,
      pagination: {
        page: result.page,
        limit: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}