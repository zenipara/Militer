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
}

export default function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading,
  emptyMessage = 'Tidak ada data',
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
          <thead className="sticky top-0 z-[1]">
            <tr className="border-b border-surface bg-slate-50/95 backdrop-blur-sm dark:bg-surface/45">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-text-muted ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface/50">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-text-muted">
                  {emptyMessage}
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
