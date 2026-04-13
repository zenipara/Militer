import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Table from '../../components/ui/Table';
import Button from '../../components/common/Button';
import { AttendanceBadge } from '../../components/common/Badge';
import Pagination, { usePagination } from '../../components/ui/Pagination';
import { TableSkeleton } from '../../components/common/Skeleton';
import { supabase } from '../../lib/supabase';
import type { Attendance } from '../../types';

const PAGE_SIZE = 50;

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AttendanceReport() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('');

  const fetchAttendance = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from('attendance')
      .select('*, user:user_id(id,nama,nrp,pangkat,satuan,role)')
      .gte('tanggal', dateFrom)
      .lte('tanggal', dateTo)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });

    if (filterStatus) query = query.eq('status', filterStatus);

    const { data } = await query;
    setAttendances((data as Attendance[]) ?? []);
    setIsLoading(false);
  }, [dateFrom, dateTo, filterStatus]);

  useEffect(() => { void fetchAttendance(); }, [fetchAttendance]);

  const handleExportCSV = () => {
    const headers = ['Tanggal', 'NRP', 'Nama', 'Satuan', 'Pangkat', 'Status', 'Check-In', 'Check-Out', 'Keterangan'];
    const rows = attendances.map((a) => [
      a.tanggal,
      a.user?.nrp ?? '',
      a.user?.nama ?? '',
      a.user?.satuan ?? '',
      a.user?.pangkat ?? '',
      a.status,
      a.check_in ? new Date(a.check_in).toLocaleTimeString('id-ID') : '',
      a.check_out ? new Date(a.check_out).toLocaleTimeString('id-ID') : '',
      a.keterangan ?? '',
    ]);
    downloadCSV([headers, ...rows], `absensi_${dateFrom}_${dateTo}.csv`);
  };

  // Summary counts
  const total = attendances.length;
  const hadir = attendances.filter((a) => a.status === 'hadir').length;
  const alpa = attendances.filter((a) => a.status === 'alpa').length;
  const sakit = attendances.filter((a) => a.status === 'sakit').length;
  const izin = attendances.filter((a) => a.status === 'izin').length;

  const { currentPage, totalPages, totalItems, paginated, setPage } = usePagination(attendances, PAGE_SIZE);

  return (
    <DashboardLayout title="Rekap Kehadiran">
      <div className="space-y-5">
        {/* Filters + Export */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-muted whitespace-nowrap">Dari:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="rounded-lg border border-surface bg-bg-card px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-muted whitespace-nowrap">Sampai:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="rounded-lg border border-surface bg-bg-card px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="rounded-lg border border-surface bg-bg-card px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">Semua Status</option>
            <option value="hadir">Hadir</option>
            <option value="alpa">Alpa</option>
            <option value="sakit">Sakit</option>
            <option value="izin">Izin</option>
            <option value="dinas_luar">Dinas Luar</option>
          </select>
          <Button variant="secondary" onClick={handleExportCSV}>⬇ Export CSV</Button>
          <Button variant="ghost" onClick={() => window.print()} data-print-hide>🖨 Cetak / PDF</Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Entri', value: total, color: 'text-text-primary' },
            { label: 'Hadir', value: hadir, color: 'text-success' },
            { label: 'Alpa', value: alpa, color: 'text-accent-red' },
            { label: 'Sakit + Izin', value: sakit + izin, color: 'text-accent-gold' },
          ].map((s) => (
            <div key={s.label} className="bg-bg-card border border-surface rounded-xl p-4">
              <p className="text-xs text-text-muted mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : (
          <>
            <Table<Attendance>
              columns={[
                {
                  key: 'tanggal',
                  header: 'Tanggal',
                  render: (a) => new Date(a.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
                },
                {
                  key: 'user',
                  header: 'Personel',
                  render: (a) => (
                    <div>
                      <p className="font-medium text-text-primary">{a.user?.nama ?? '—'}</p>
                      <p className="font-mono text-xs text-text-muted">{a.user?.nrp}</p>
                    </div>
                  ),
                },
                { key: 'satuan', header: 'Satuan', render: (a) => a.user?.satuan ?? '—' },
                { key: 'status', header: 'Status', render: (a) => <AttendanceBadge status={a.status} /> },
                {
                  key: 'check_in',
                  header: 'Check-In',
                  render: (a) => a.check_in
                    ? new Date(a.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                    : '—',
                },
                {
                  key: 'check_out',
                  header: 'Check-Out',
                  render: (a) => a.check_out
                    ? new Date(a.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                    : '—',
                },
              ]}
              data={paginated}
              keyExtractor={(a) => a.id}
              isLoading={false}
              emptyMessage="Tidak ada data absensi untuk rentang tanggal ini"
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

