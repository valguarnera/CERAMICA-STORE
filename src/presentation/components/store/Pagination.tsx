'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
}

export function Pagination({ currentPage, totalPages, baseUrl, searchParams = {} }: PaginationProps) {
  if (totalPages <= 1) return null;

  const createHref = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    return `${baseUrl}?${params.toString()}`;
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pages.filter(
    (p) => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)
  );

  const PrevNext = ({ page, label, icon }: { page: number; label: string; icon: React.ReactNode }) => {
    const disabled = page < 1 || page > totalPages;
    const href = createHref(page);
    const className = "flex h-9 w-9 items-center justify-center rounded border bg-background text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";
    if (disabled) {
      return (
        <span className={className} aria-label={label} aria-disabled="true">
          {icon}
        </span>
      );
    }
    return (
      <Link href={href} className={className} aria-label={label}>
        {icon}
      </Link>
    );
  };

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Paginación">
      <PrevNext page={currentPage - 1} label="Página anterior" icon={<ChevronLeft className="h-4 w-4" />} />

      {visiblePages.map((page, idx) => {
        const prev = visiblePages[idx - 1];
        const showEllipsis = prev && page - prev > 1;

        return (
          <span key={page} className="flex items-center gap-1">
            {showEllipsis && <span className="px-2 text-muted-foreground">…</span>}
            {page === currentPage ? (
              <span
                className="flex h-9 min-w-9 items-center justify-center rounded border bg-primary text-primary-foreground text-sm font-medium"
                aria-current="page"
              >
                {page}
              </span>
            ) : (
              <Link
                href={createHref(page)}
                className="flex h-9 min-w-9 items-center justify-center rounded border bg-background text-sm font-medium hover:bg-accent"
              >
                {page}
              </Link>
            )}
          </span>
        );
      })}

      <PrevNext page={currentPage + 1} label="Página siguiente" icon={<ChevronRight className="h-4 w-4" />} />
    </nav>
  );
}