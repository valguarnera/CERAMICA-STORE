'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatARS } from '@/presentation/lib/currency';
import { useCart } from '@/presentation/hooks/useCart';
import { useToast } from '@/presentation/components/ui/Toast';
import { ShoppingCart, PackageX } from 'lucide-react';

interface ProductCardProps {
  product: {
    id: string;
    slug: string;
    name: string;
    priceCents: number;
    stock: number;
    images: string | null;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const images = product.images ? JSON.parse(product.images) : [];
  const imageUrl = images.length > 0 ? images[0] : '/placeholder.svg';

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addItem(product.id, 1);
      toast({ title: 'Agregado al carrito', description: product.name });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al agregar';
      toast({ title: 'No se pudo agregar', description: message, variant: 'destructive' });
    }
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
      <Link href={`/productos/${product.slug}`} className="relative aspect-square overflow-hidden">
        {imageUrl !== '/placeholder.svg' ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform hover:scale-105"
            sizes="256px"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted">
            <PackageX className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="rounded bg-destructive px-3 py-1 text-sm font-medium text-destructive-foreground">
              Agotado
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/productos/${product.slug}`} className="font-medium line-clamp-2 hover:underline">
          {product.name}
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="text-lg font-semibold">{formatARS(product.priceCents)}</span>
          <button
            onClick={handleAdd}
            disabled={product.stock === 0}
            className="flex h-9 items-center gap-2 rounded bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Agregar ${product.name} al carrito`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Agregar</span>
          </button>
        </div>
      </div>
    </article>
  );
}