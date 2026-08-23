'use client';

import Image from 'next/image';
import { useState } from 'react';
import { formatARS } from '@/presentation/lib/currency';
import { useCart } from '@/presentation/hooks/useCart';
import { useToast } from '@/presentation/components/ui/Toast';
import { ChevronLeft, ChevronRight, Package, Minus, Plus, ShoppingCart } from 'lucide-react';

interface ProductDetailProps {
  product: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    priceCents: number;
    stock: number;
    images: string | null;
    metadata: string | null;
  };
}

export function ProductDetail({ product }: ProductDetailProps) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const images = product.images ? JSON.parse(product.images) : [];
  const [currentImage, setCurrentImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const handleAdd = async () => {
    try {
      await addItem(product.id, quantity);
      toast({ title: 'Agregado al carrito', description: `${product.name} (x${quantity})` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al agregar';
      toast({ title: 'No se pudo agregar', description: message, variant: 'destructive' });
    }
  };

  const metadata = product.metadata ? JSON.parse(product.metadata) : {};

  return (
    <article className="space-y-6">
      {/* Gallery */}
      <div className="relative rounded-lg border bg-card overflow-hidden">
        <div className="aspect-square relative">
          {images.length > 0 ? (
            <>
              <Image
                src={images[currentImage]}
                alt={`${product.name} - imagen ${currentImage + 1}`}
                fill
                className="object-cover"
                priority
                sizes="512px"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 hover:bg-background"
                    aria-label="Imagen anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setCurrentImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 hover:bg-background"
                    aria-label="Imagen siguiente"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-muted">
              <Package className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 p-4 overflow-x-auto">
            {images.map((img: string, idx: number) => (
              <button
                key={idx}
                onClick={() => setCurrentImage(idx)}
                className={`relative h-16 w-16 flex-shrink-0 rounded border-2 overflow-hidden transition-colors ${
                  idx === currentImage ? 'border-primary' : 'border-transparent hover:border-muted'
                }`}
                aria-label={`Ver imagen ${idx + 1}`}
                aria-current={idx === currentImage ? 'true' : 'false'}
              >
                <Image src={img} alt="" fill className="object-cover" sizes="64px" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{product.name}</h1>

        <div className="flex items-center gap-4 text-lg">
          <span className="text-2xl font-semibold">{formatARS(product.priceCents)}</span>
          {product.stock === 0 ? (
            <span className="text-destructive font-medium">Agotado</span>
          ) : (
            <span className="text-muted-foreground">Disponible: {product.stock}</span>
          )}
        </div>

        {product.description && (
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <p>{product.description}</p>
          </div>
        )}

        {Object.keys(metadata).length > 0 && (
          <dl className="grid gap-2 sm:grid-cols-2 border-t pt-4">
            {Object.entries(metadata).map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <dt className="text-sm font-medium text-muted-foreground">{key}</dt>
                <dd className="text-sm">{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}

        {/* Quantity selector & Add to cart */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center border-t pt-4">
          <div className="flex items-center gap-2 border rounded">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="p-2 hover:bg-accent"
              aria-label="Disminuir cantidad"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-12 text-center font-medium">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
              disabled={quantity >= product.stock}
              className="p-2 hover:bg-accent disabled:opacity-50"
              aria-label="Aumentar cantidad"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleAdd}
            disabled={product.stock === 0}
            className="flex-1 flex items-center justify-center gap-2 rounded bg-primary px-6 py-3 text-lg font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart className="h-5 w-5" />
            Agregar al carrito
          </button>
        </div>
      </div>
    </article>
  );
}