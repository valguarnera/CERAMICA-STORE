import { Metadata } from 'next';
import { getDatabase } from '@/infrastructure/database';
import { ProductService } from '@/domain/services';
import { ProductGrid } from '@/presentation/components/store/ProductGrid';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'CERAMICA-STORE - Cerámica artesanal',
  description: 'Tienda online de cerámica artesanal',
};

async function getFeaturedProducts() {
  const db = getDatabase();
  const productService = new ProductService(db);
  const result = await productService.findMany({
    page: 1,
    pageSize: 8,
    active: true,
    sort: '-created_at',
  });
  return result.products;
}

export default async function HomePage() {
  const products = await getFeaturedProducts();

  return (
    <div className="container mx-auto px-4 py-12">
      <section className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">CERAMICA-STORE</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Cerámica artesanal única, hecha a mano con dedicación y tradición.
        </p>
        <Link
          href="/productos"
          className="mt-6 inline-block rounded bg-primary px-8 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90"
        >
          Ver catálogo
        </Link>
      </section>

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Productos destacados</h2>
          <Link
            href="/productos"
            className="text-sm font-medium hover:underline"
          >
            Ver todos →
          </Link>
        </div>
        <ProductGrid
          products={products.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            priceCents: p.priceCents,
            stock: p.stock,
            images: p.images,
          }))}
        />
      </section>
    </div>
  );
}