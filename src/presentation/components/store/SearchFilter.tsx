'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

export function SearchFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get('q') || '';
  const currentSort = searchParams.get('sort') || '-created_at';

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = formData.get('q')?.toString() || '';
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set('q', q);
    else params.delete('q');
    params.set('page', '1');
    router.push(`/productos?${params.toString()}`);
  };

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', value);
    params.set('page', '1');
    router.push(`/productos?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <form onSubmit={handleSearch} className="relative w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          defaultValue={currentSearch}
          placeholder="Buscar productos..."
          className="w-full rounded border bg-background px-9 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </form>

      <div className="flex items-center gap-2">
        <label htmlFor="sort" className="text-sm text-muted-foreground">
          Ordenar:
        </label>
        <select
          id="sort"
          defaultValue={currentSort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="-created_at">Más recientes</option>
          <option value="price_asc">Precio: menor a mayor</option>
          <option value="price_desc">Precio: mayor a menor</option>
          <option value="name_asc">Nombre: A-Z</option>
          <option value="name_desc">Nombre: Z-A</option>
        </select>
      </div>
    </div>
  );
}