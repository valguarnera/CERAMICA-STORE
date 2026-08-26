import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/infrastructure/database';
import { ProductService } from '@/domain/services';
import { ProductListOptions, SortOption } from '@/domain/services/product';
import { productCreateSchema } from '@/domain/schemas';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const activeParam = searchParams.get('active');
    const search = searchParams.get('search') || undefined;
    const sortParam = searchParams.get('sort') || '-created_at';
    const allowedSorts: SortOption[] = ['price_asc', 'price_desc', 'name_asc', 'name_desc', '-created_at'];
    const sort: SortOption = allowedSorts.includes(sortParam as SortOption) ? (sortParam as SortOption) : '-created_at';

    const db = getDatabase();
    const productService = new ProductService(db);

    const options: ProductListOptions & { active?: boolean | null } = { page, pageSize, search, sort };
    if (activeParam !== null) {
      options.active = activeParam === 'true';
    }

    const result = await productService.adminFindMany(options);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin products list error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = productCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const productService = new ProductService(db);

    try {
      const product = await productService.create({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description ?? null,
        priceCents: parsed.data.price_cents,
        stock: parsed.data.stock,
        images: parsed.data.images,
        active: parsed.data.active,
        metadata: parsed.data.metadata ?? null,
      });

      return NextResponse.json({ product }, { status: 201 });
    } catch (error) {
      if (error instanceof Error && error.message === 'SLUG_EXISTS') {
        return NextResponse.json({ error: 'El slug ya existe' }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Admin product create error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}