import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDatabase } from '@/infrastructure/database';
import { ProductService } from '@/domain/services';
import { ProductGrid } from '@/presentation/components/store/ProductGrid';
import { SearchFilter } from '@/presentation/components/store/SearchFilter';
import { Pagination } from '@/presentation/components/store/Pagination';

export const metadata: Metadata = {
  title: 'Catálogo - CERAMICA-STORE',
  description: 'Explora nuestro catálogo de cerámica artesanal',
};

interface CatalogPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    q?: string;
    sort?: string;
  }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { page = '1', limit = '12', q, sort = '-created_at' } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));

  const db = getDatabase();
  const productService = new ProductService(db);

  const result = await productService.findMany({
    page: pageNum,
    pageSize: limitNum,
    active: true,
    search: q,
    sort: sort as 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | '-created_at',
  });

  if (result.products.length === 0 && pageNum > 1) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Catálogo de productos</h1>
        <p className="text-muted-foreground">
          {result.total} producto{result.total !== 1 ? 's' : ''} encontrado{result.total !== 1 ? 's' : ''}
        </p>
      </header>

      <SearchFilter />

      <ProductGrid
        products={result.products.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          priceCents: p.priceCents,
          stock: p.stock,
          images: p.images,
        }))}
      />

      <Pagination
        currentPage={result.page}
        totalPages={result.totalPages}
        baseUrl="/productos"
        searchParams={{
          ...(q && { q }),
          ...(sort !== '-created_at' && { sort }),
        }}
      />
    </div>
  );
}