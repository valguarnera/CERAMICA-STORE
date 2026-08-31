'use client';

import { useState } from 'react';
import { ArrowLeft, Save, AlertCircle, X, Image as ImageIcon, Upload } from 'lucide-react';
import Link from 'next/link';
import { slugify } from '@/presentation/lib/utils';
import { cn } from '@/presentation/lib/utils';

export interface UploadedImage {
  id: string;
  original: string;
  thumbnail: string;
}

interface ProductFormProps {
  initialData?: {
    name: string;
    slug: string;
    description: string;
    price_cents: number;
    stock: number;
    images: UploadedImage[];
    active: boolean;
    metadata: Record<string, unknown> | null;
  };
  onSubmit: (data: {
    name: string;
    slug: string;
    description: string;
    price_cents: number;
    stock: number;
    images: UploadedImage[];
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
    images: initialData?.images || [],
    active: initialData?.active ?? true,
    metadata: initialData?.metadata || {},
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

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
      images: formData.images,
      active: formData.active,
      metadata: formData.metadata,
    });
  };

  const removeImage = (imageId: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== imageId),
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('files', f));
    try {
      const res = await fetch('/api/admin/uploads/products', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al subir imágenes');
        return;
      }
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...data.images],
      }));
    } catch {
      alert('Error de red al subir imágenes');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
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
          <label className="block text-sm font-medium text-gray-700">Imágenes</label>
          <div className="mt-2 space-y-4">
            {formData.images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {formData.images.map((img) => (
                  <div key={img.id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                      <img
                        src={img.thumbnail}
                        alt={formData.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                      aria-label="Quitar imagen"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <span className="absolute bottom-1 left-1 right-1 bg-black/50 text-white text-xs px-1 rounded truncate">
                      {img.original.split('/').pop()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
                <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                <p>No hay imágenes. Sube archivos o arrastra aquí.</p>
              </div>
            )}

            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700">Subir archivos</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
              {uploading && <p className="mt-1 text-sm text-gray-500 flex items-center gap-1"><Upload className="h-4 w-4 animate-spin" /> Subiendo...</p>}
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