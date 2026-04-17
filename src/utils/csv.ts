/**
 * downloadCSV — Utilitas ekspor data ke file CSV.
 *
 * Setiap nilai dikelilingi tanda kutip ganda; karakter kutip ganda di dalam
 * nilai di-escape dengan menggandakannya (standar RFC 4180).
 *
 * Penggunaan:
 *   downloadCSV([['Nama', 'NRP'], ['Ali', '1234']], 'export.csv');
 */
export function downloadCSV(rows: string[][], filename: string): void {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
