'use client';

import { useState, useEffect } from 'react';
import { Trash2, PackageCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/presentation/lib/utils';

interface StoredImage {
  id: string;
  originalPath: string;
  thumbnailPath: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  referenced: boolean;
}

export default function StoragePage() {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'referenced' | 'orphaned'>('all');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/storage');
      if (res.ok) {
        const json = await res.json();
        setImages(json.images);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta imagen permanentemente? Esta acción no se puede deshacer.')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/storage/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchImages();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al eliminar imagen');
      }
    } catch {
      alert('Error de red');
    } finally {
      setDeleting(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredImages = images.filter(img => {
    if (filter === 'referenced') return img.referenced;
    if (filter === 'orphaned') return !img.referenced;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Storage</h1>
          <p className="text-sm text-gray-600">Gestiona las imágenes almacenadas</p>
        </div>
        <button onClick={fetchImages} disabled={loading} className="btn-secondary">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{images.length}</div>
          <div className="text-sm text-gray-600">Total imágenes</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {images.filter(i => i.referenced).length}
          </div>
          <div className="text-sm text-gray-600">En uso</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">
            {images.filter(i => !i.referenced).length}
          </div>
          <div className="text-sm text-gray-600">Sin referencias (huérfanas)</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'referenced', 'orphaned'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition',
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {f === 'all' && 'Todas'}
            {f === 'referenced' && 'En uso'}
            {f === 'orphaned' && 'Huérfanas'}
            <span className="ml-2 px-2 py-0.5 text-xs bg-white/20 rounded">
              {images.filter(i => f === 'all' || (f === 'referenced' && i.referenced) || (f === 'orphaned' && !i.referenced)).length}
            </span>
          </button>
        ))}
      </div>

      {/* Images Grid */}
      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-gray-200 rounded" />
          ))}
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="text-center py-12">
          <PackageCheck className="h-12 w-12 mx-auto text-gray-300" />
          <p className="mt-2 text-gray-500">
            {filter === 'orphaned' ? 'No hay imágenes huérfanas' : 'No hay imágenes almacenadas'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredImages.map(img => (
            <div
              key={img.id}
              className={cn(
                'relative group bg-white rounded-lg border border-gray-200 overflow-hidden transition-shadow hover:shadow-md',
                !img.referenced && 'ring-2 ring-yellow-400'
              )}
            >
              <div className="aspect-square relative overflow-hidden bg-gray-50">
                <img
                  src={img.thumbnailPath}
                  alt={img.originalName}
                  className="w-full h-full object-cover"
                />
                {!img.referenced && (
                  <div className="absolute inset-0 bg-yellow-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-yellow-600" />
                  </div>
                )}
              </div>
              <div className="p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-900 truncate">{img.originalName}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', img.referenced ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                    {img.referenced ? 'En uso' : 'Huérfana'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 flex items-center justify-between">
                  <span>{formatSize(img.size)}</span>
                  <span>{formatDate(img.createdAt)}</span>
                </div>
                {!img.referenced && (
                  <button
                    onClick={() => handleDelete(img.id)}
                    disabled={deleting === img.id}
                    className="w-full mt-2 text-xs text-red-600 hover:text-red-700 flex items-center justify-center gap-1"
                  >
                    {deleting === img.id ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3 w-3" />
                        Eliminar permanentemente
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}