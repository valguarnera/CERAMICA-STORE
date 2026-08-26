'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProductForm } from '@/presentation/components/admin/ProductForm';

interface ProductData {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_cents: number;
  stock: number;
  images: string[];
  active: boolean;
  metadata: Record<string, unknown> | null;
}

export default function EditarProductoPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/admin/products/${params.id}`);
        if (res.ok) {
          const json = await res.json();
          const p = json.product;
          setProduct({
            ...p,
            images: p.images ? JSON.parse(p.images) : [],
            metadata: p.metadata ? JSON.parse(p.metadata) : null,
          });
        } else {
          setError('Producto no encontrado');
        }
      } catch {
        setError('Error al cargar producto');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [params.id]);

  const handleSubmit = async (data: {
    name: string;
    slug: string;
    description: string;
    price_cents: number;
    stock: number;
    images: string[];
    active: boolean;
    metadata: Record<string, unknown> | null;
  }) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        router.push('/admin/productos');
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al actualizar producto');
      }
    } catch {
      alert('Error de red');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6" />
        <div className="space-y-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-xl font-bold text-red-600">{error || 'Producto no encontrado'}</h1>
      </div>
    );
  }

  return (
    <div className="p-6">
      <ProductForm
        initialData={product}
        title={`Editar: ${product.name}`}
        onSubmit={handleSubmit}
        loading={saving}
      />
    </div>
  );
}