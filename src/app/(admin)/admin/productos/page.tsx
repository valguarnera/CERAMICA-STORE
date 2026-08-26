'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductTable } from '@/presentation/components/admin/ProductTable';
import { cn } from '@/presentation/lib/utils';

interface Product {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  stock: number;
  active: boolean;
  images: string | null;
  createdAt: string;
}

interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function ProductosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<PaginatedProducts | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [activeFilter, setActiveFilter] = useState(searchParams.get('active') || '');
  const [page, setPage] = useState(1);

  const fetchProducts = useCallback(async (pageNum = 1) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(pageNum));
    params.set('pageSize', '20');
    if (search) params.set('search', search);
    if (activeFilter) params.set('active', activeFilter);
    params.set('sort', '-created_at');

    try {
      const res = await fetch(`/api/admin/products?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [search, activeFilter]);

  useEffect(() => {
    fetchProducts(page);
  }, [page, fetchProducts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(cents / 100);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-600">Gestiona el catálogo de la tienda</p>
        </div>
        <Link href="/admin/productos/nuevo" className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo producto
        </Link>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, descripción..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={activeFilter}
          onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); setPage(1); }}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
            Limpiar
          </button>
        )}
      </form>

      {/* Table */}
      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      ) : data ? (
        <>
          <ProductTable
            products={data.products}
            formatPrice={formatPrice}
            onEdit={(id) => router.push(`/admin/productos/${id}/editar`)}
            onToggleActive={(id, active) => {
              // quick toggle via API
              fetch(`/api/admin/products/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !active }),
              }).then(() => fetchProducts(page));
            }}
            onDelete={async (id) => {
              if (!confirm('¿Eliminar producto? Esta acción no se puede deshacer.')) return;
              // soft delete = set active false
              await fetch(`/api/admin/products/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: false }),
              });
              fetchProducts(page);
            }}
          />

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={cn(
                  'p-2 rounded-lg border',
                  page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="px-4 text-sm text-gray-700">
                Página {page} de {data.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className={cn(
                  'p-2 rounded-lg border',
                  page === data.totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}