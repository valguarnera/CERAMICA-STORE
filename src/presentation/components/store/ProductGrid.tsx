'use client';

import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Array<{
    id: string;
    slug: string;
    name: string;
    priceCents: number;
    stock: number;
    images: string | null;
  }>;
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No hay productos disponibles
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}