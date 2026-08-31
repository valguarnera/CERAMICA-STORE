'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductForm } from '@/presentation/components/admin/ProductForm';
import type { UploadedImage } from '@/presentation/components/admin/ProductForm';

export default function NuevoProductoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: {
    name: string;
    slug: string;
    description: string;
    price_cents: number;
    stock: number;
    images: UploadedImage[];
    active: boolean;
    metadata: Record<string, unknown> | null;
  }) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          images: data.images.map(img => img.original),
        }),
      });
      if (res.ok) {
        router.push('/admin/productos');
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al crear producto');
      }
    } catch {
      alert('Error de red');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <ProductForm
        title="Nuevo producto"
        onSubmit={handleSubmit}
        loading={loading}
      />
    </div>
  );
}