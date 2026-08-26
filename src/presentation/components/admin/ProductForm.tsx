'use client';

import { useState } from 'react';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { slugify } from '@/presentation/lib/utils';
import { cn } from '@/presentation/lib/utils';

interface ProductFormProps {
  initialData?: {
    name: string;
    slug: string;
    description: string;
    price_cents: number;
    stock: number;
    images: string[];
    active: boolean;
    metadata: Record<string, unknown> | null;
  };
  onSubmit: (data: {
    name: string;
    slug: string;
    description: string;
    price_cents: number;
    stock: number;
    images: string[];
    active: boolean;
    metadata: Record<string, unknown> | null;
  }) => Promise<void>;
  loading?: boolean;
  title: string;
}

export function ProductForm({ initialData, onSubmit, loading, title }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    price_cents: initialData?.price_cents || 0,
    stock: initialData?.stock || 0,
    images: initialData?.images || [''],
    active: initialData?.active ?? true,
    metadata: initialData?.metadata || {},
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageUrls, setImageUrls] = useState(formData.images.filter(Boolean));
  const [newImageUrl, setNewImageUrl] = useState('');

  // auto-generate slug from name
  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      slug: prev.slug ? prev.slug : slugify(value),
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es obligatorio';
    if (!formData.slug.trim()) newErrors.slug = 'El slug es obligatorio';
    else if (!/^[a-z0-9-]+$/.test(formData.slug)) newErrors.slug = 'Solo minúsculas, números y guiones';
    if (formData.price_cents <= 0) newErrors.price_cents = 'El precio debe ser mayor a 0';
    if (formData.stock < 0) newErrors.stock = 'El stock no puede ser negativo';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      description: formData.description.trim(),
      price_cents: formData.price_cents,
      stock: formData.stock,
      images: imageUrls,
      active: formData.active,
      metadata: formData.metadata,
    });
  };

  const addImage = () => {
    if (newImageUrl.trim() && !imageUrls.includes(newImageUrl.trim())) {
      setImageUrls([...imageUrls, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const removeImage = (url: string) => {
    setImageUrls(imageUrls.filter(u => u !== url));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <Link href="/admin/productos" className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <ul className="list-disc list-inside space-y-1 text-sm">
            {Object.values(errors).map((msg, i) => <li key={i}>{msg}</li>)}
          </ul>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Nombre *</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => handleNameChange(e.target.value)}
            className={cn('mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500', errors.name && 'border-red-500')}
            placeholder="Ej: Jarrón artesanal"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Slug *</label>
          <input
            type="text"
            value={formData.slug}
            onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
            className={cn('mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500', errors.slug && 'border-red-500')}
            placeholder="generado-automaticamente"
          />
          {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Descripción</label>
          <textarea
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={4}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Descripción del producto..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Precio (centavos) *</label>
          <input
            type="number"
            min="1"
            value={formData.price_cents}
            onChange={e => setFormData(prev => ({ ...prev, price_cents: parseInt(e.target.value) || 0 }))}
            className={cn('mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500', errors.price_cents && 'border-red-500')}
          />
          {errors.price_cents && <p className="mt-1 text-sm text-red-600">{errors.price_cents}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Stock *</label>
          <input
            type="number"
            min="0"
            value={formData.stock}
            onChange={e => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
            className={cn('mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500', errors.stock && 'border-red-500')}
          />
          {errors.stock && <p className="mt-1 text-sm text-red-600">{errors.stock}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Imágenes (URLs)</label>
          <div className="mt-2 space-y-2">
            {imageUrls.map((url, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={e => {
                    const arr = [...imageUrls];
                    arr[idx] = e.target.value;
                    setImageUrls(arr);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={e => setNewImageUrl(e.target.value)}
                placeholder="Agregar otra URL..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <button type="button" onClick={addImage} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Agregar
              </button>
            </div>
            <p className="text-xs text-gray-500">Máximo 10 imágenes. La primera será la principal.</p>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={e => setFormData(prev => ({ ...prev, active: e.target.checked }))}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Producto activo</span>
          </label>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Metadata (JSON opcional)</label>
          <textarea
            value={JSON.stringify(formData.metadata, null, 2)}
            onChange={e => {
              try {
                setFormData(prev => ({ ...prev, metadata: JSON.parse(e.target.value) }));
              } catch { /* ignore invalid json while typing */ }
            }}
            rows={4}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
            placeholder='{ "color": "azul", "material": "cerámica" }'
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Link href="/admin/productos" className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}