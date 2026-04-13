import { useState } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Optional: show "X–Y of Z" label */
  totalItems?: number;
  pageSize?: number;
}

/**
 * Pagination bar — spec §13.2: 50 rows per page.
 */
export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = 50,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | '…')[] = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems ?? currentPage * pageSize);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
      {totalItems !== undefined && (
        <p className="text-xs text-text-muted">
          Menampilkan {from}–{to} dari {totalItems} data
        </p>
      )}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded-lg text-sm text-text-muted bg-surface/40 hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Halaman sebelumnya"
        >
          ←
        </button>
        {pages.map((p, idx) =>
          p === '…' ? (
            <span key={`e${idx}`} className="px-2 text-text-muted text-sm select-none">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[32px] px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                p === currentPage ? 'bg-primary text-white' : 'text-text-muted bg-surface/40 hover:bg-surface'
              }`}
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 rounded-lg text-sm text-text-muted bg-surface/40 hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Halaman berikutnya"
        >
          →
        </button>
      </div>
    </div>
  );
}

/**
 * Helper hook: slices `data` to the current page.
 */
export function usePagination<T>(data: T[], pageSize = 50) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = data.slice((safePage - 1) * pageSize, safePage * pageSize);
  return { currentPage: safePage, totalPages, totalItems: data.length, paginated, setPage: setCurrentPage };
}
