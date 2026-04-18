import type { ReactNode } from 'react';

/** Definisi satu kolom tabel */
interface Column<T> {
  /** Key dari objek data, atau string custom jika menggunakan `render` */
  key: keyof T | string;
  /** Judul kolom yang ditampilkan di header */
  header: ReactNode;
  /** Render custom untuk cell. Jika tidak ada, nilai diambil dari `row[key]` */
  render?: (row: T) => ReactNode;
  /** Class CSS tambahan untuk kolom (header dan cell) */
  className?: string;
}

/**
 * Table — komponen tabel generik yang dapat digunakan di seluruh aplikasi.
 *
 * @example
 * ```tsx
 * <Table
 *   columns={[
 *     { key: 'nama', header: 'Nama' },
 *     { key: 'status', header: 'Status', render: (row) => <Badge>{row.status}</Badge> },
 *   ]}
 *   data={users}
 *   keyExtractor={(u) => u.id}
 *   isLoading={isLoading}
 *   emptyMessage="Tidak ada pengguna"
 * />
 * ```
 */
interface TableProps<T> {
  /** Definisi kolom-kolom tabel */
  columns: Column<T>[];
  /** Data yang ditampilkan */
  data: T[];
  /** Fungsi untuk mendapatkan key unik per baris (biasanya `id`) */
  keyExtractor: (row: T) => string;
  /** Tampilkan skeleton loading jika true */
  isLoading?: boolean;
  /** Pesan yang ditampilkan saat data kosong */
  emptyMessage?: string;
  /** Deskripsi aksesibel untuk tabel — dirender sebagai caption tersembunyi */
  caption?: string;
}

export default function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading,
  emptyMessage = 'Tidak ada data',
  caption,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="app-panel overflow-hidden rounded-2xl">
        <div className="space-y-3 p-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-surface/70" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="app-panel overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="sticky top-0 z-[1]">
            <tr className="border-b border-surface bg-slate-50/95 backdrop-blur-sm dark:bg-surface/45">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-text-muted ${col.className ?? ''}`}
                  scope="col"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface/50">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-text-muted">
                    <svg className="h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={keyExtractor(row)} className="transition-colors hover:bg-slate-50 dark:hover:bg-surface/25">
                  {columns.map((col) => (
                    <td key={String(col.key)} className={`px-5 py-4 text-sm text-text-primary ${col.className ?? ''}`}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[String(col.key)] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
