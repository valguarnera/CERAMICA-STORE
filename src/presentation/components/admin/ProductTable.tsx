'use client';

import { Image, PackageCheck, X, Edit, Trash2 } from 'lucide-react';
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

interface ProductTableProps {
  products: Product[];
  formatPrice: (cents: number) => string;
  onEdit: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}

export function ProductTable({ products, formatPrice, onEdit, onToggleActive, onDelete }: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <PackageCheck className="h-12 w-12 mx-auto text-gray-300" />
        <p className="mt-2 text-gray-500">No hay productos</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
            <th className="pb-3">Imagen</th>
            <th className="pb-3">Nombre / Slug</th>
            <th className="pb-3">Precio</th>
            <th className="pb-3">Stock</th>
            <th className="pb-3">Estado</th>
            <th className="pb-3 w-32">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-gray-50">
              <td className="py-4">
                {product.images ? (
                  <img
                    src={JSON.parse(product.images)[0]}
                    alt={product.name}
                    className="h-12 w-12 object-cover rounded"
                  />
                ) : (
                  <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center">
                    <Image className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </td>
              <td className="py-4">
                <div className="font-medium text-gray-900">{product.name}</div>
                <div className="text-sm text-gray-500">{product.slug}</div>
              </td>
              <td className="py-4 text-gray-900">{formatPrice(product.priceCents)}</td>
              <td className="py-4 text-gray-900">{product.stock}</td>
              <td className="py-4">
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    product.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  )}
                >
                  {product.active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="py-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(product.id)}
                    className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onToggleActive(product.id, product.active)}
                    className={cn(
                      'p-2 rounded-lg transition',
                      product.active
                        ? 'text-yellow-600 hover:bg-yellow-50'
                        : 'text-green-600 hover:bg-green-50'
                    )}
                    title={product.active ? 'Desactivar' : 'Activar'}
                  >
                    {product.active ? <PackageCheck className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => onDelete(product.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Desactivar (soft delete)"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}