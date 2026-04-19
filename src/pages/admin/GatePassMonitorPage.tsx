import { useEffect, useMemo, useState } from 'react';
import { useGatePassStore } from '../../store/gatePassStore';
import { useGatePassRealtime } from '../../hooks/useGatePassRealtime';
import GatePassStatusBadge from '../../components/gatepass/GatePassStatusBadge';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import type { GatePass, GatePassStatus } from '../../types';
import { supabase } from '../../lib/supabase';

interface MonitorGatePass extends GatePass {
  effectiveStatus: GatePassStatus;
}

function normalizeLegacyStatus(status: GatePassStatus): GatePassStatus {
  if (status === 'out') return 'checked_in';
  if (status === 'returned') return 'completed';
  return status;
}

function getEffectiveStatus(gatePass: GatePass, now: Date): GatePassStatus {
  const normalized = normalizeLegacyStatus(gatePass.status);

  if (normalized === 'checked_in' && gatePass.waktu_kembali) {
    const backAt = new Date(gatePass.waktu_kembali);
    if (!Number.isNaN(backAt.getTime()) && backAt < now) return 'overdue';
  }
  return normalized;
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}j ${minutes}m`;
}

function getStatusLabel(status: GatePassStatus | 'all') {
  const labels: Record<GatePassStatus | 'all', string> = {
    all: 'Semua status',
    pending: 'Menunggu',
    approved: 'Siap Scan Keluar',
    rejected: 'Ditolak',
    checked_in: 'Sedang Keluar',
    completed: 'Sudah Kembali',
    out: 'Sedang Keluar',
    returned: 'Sudah Kembali',
    overdue: 'Terlambat',
  };
  return labels[status];
}

function parseTimeMs(value?: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
}

function compareMonitorPriority(a: MonitorGatePass, b: MonitorGatePass, now: Date) {
  const rank: Record<GatePassStatus, number> = {
    overdue: 0,
    checked_in: 1,
    approved: 2,
    completed: 3,
    pending: 4,
    out: 1,
    returned: 3,
    rejected: 5,
  };

  const statusDelta = rank[a.effectiveStatus] - rank[b.effectiveStatus];
  if (statusDelta !== 0) return statusDelta;

  if (a.effectiveStatus === 'overdue' && b.effectiveStatus === 'overdue') {
    const aLateMs = now.getTime() - parseTimeMs(a.waktu_kembali);
    const bLateMs = now.getTime() - parseTimeMs(b.waktu_kembali);
    return bLateMs - aLateMs;
  }

  if (a.effectiveStatus === 'checked_in' && b.effectiveStatus === 'checked_in') {
    return parseTimeMs(a.waktu_kembali) - parseTimeMs(b.waktu_kembali);
  }

  return parseTimeMs(b.waktu_keluar) - parseTimeMs(a.waktu_keluar);
}

function isWithinDateRange(value: string | undefined, startDate: string, endDate: string) {
  if (!startDate && !endDate) return true;
  if (!value) return false;

  const valueMs = new Date(value).getTime();
  if (Number.isNaN(valueMs)) return false;

  const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const endMs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;

  return valueMs >= startMs && valueMs <= endMs;
}

function csvEscape(value: string | number | undefined) {
  if (value === undefined) return '""';
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function GatePassMonitorPage() {
  const gatePasses = useGatePassStore(s => s.gatePasses);
  const fetchGatePasses = useGatePassStore(s => s.fetchGatePasses);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GatePassStatus | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPersonil, setTotalPersonil] = useState(0);
  useGatePassRealtime();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    (async () => {
      setError(null);
      try {
        await fetchGatePasses();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data gate pass');
      }
      
      // Fetch total personil separately - non-blocking
      try {
        const userCountResult = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true);
        setTotalPersonil(userCountResult.count ?? 0);
      } catch (err) {
        console.error('Error fetching total personil:', err);
        setTotalPersonil(0);
      }
      
      setIsInitialLoading(false);
    })();
  }, [fetchGatePasses]);

  const monitorRows = useMemo<MonitorGatePass[]>(
    () => gatePasses.map(gp => ({ ...gp, effectiveStatus: getEffectiveStatus(gp, now) })),
    [gatePasses, now],
  );

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return monitorRows
      .filter(gp => {
        const statusMatch = statusFilter === 'all' || gp.effectiveStatus === statusFilter;
        if (!statusMatch) return false;
        const dateMatch = isWithinDateRange(gp.waktu_keluar || gp.created_at, startDate, endDate);
        if (!dateMatch) return false;
        if (!q) return true;
        const haystack = [gp.user?.nama, gp.user?.nrp, gp.tujuan, gp.keperluan].join(' ').toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => compareMonitorPriority(a, b, now));
  }, [monitorRows, query, statusFilter, startDate, endDate, now]);

  // Memoize statistics computation to avoid recalculation on every render
  const { approved, keluar, completed, overdue, personilDiLuar, personilTersedia } = useMemo(() => {
    const approvedCount = monitorRows.filter(gp => gp.effectiveStatus === 'approved').length;
    const keluarCount = monitorRows.filter(gp => gp.effectiveStatus === 'checked_in').length;
    const completedCount = monitorRows.filter(gp => gp.effectiveStatus === 'completed').length;
    const overdueCount = monitorRows.filter(gp => gp.effectiveStatus === 'overdue').length;
    
    // Personil di luar = approved + checked_in + overdue
    const diLuarCount = approvedCount + keluarCount + overdueCount;
    // Personil tersedia = total personil - personil di luar (minimum 0)
    const tersediaCount = Math.max(0, totalPersonil - diLuarCount);
    
    return {
      approved: approvedCount,
      keluar: keluarCount,
      completed: completedCount,
      overdue: overdueCount,
      personilDiLuar: diLuarCount,
      personilTersedia: tersediaCount,
    };
  }, [monitorRows, totalPersonil]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await fetchGatePasses();
      setNow(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat ulang data gate pass');
    } finally {
      setIsRefreshing(false);
    }
  };

  const resetFilters = () => {
    setQuery('');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const applyDatePreset = (days: number) => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - (days - 1));
    setStartDate(toDateInputValue(from));
    setEndDate(toDateInputValue(today));
  };

  const handleExportCsv = () => {
    if (filteredRows.length === 0) return;

    const header = [
      'ID',
      'Nama',
      'NRP',
      'Pangkat',
      'Satuan',
      'Status',
      'Tujuan',
      'Keperluan',
      'Waktu Keluar',
      'Batas Kembali',
      'Durasi Kritis (menit)',
    ];

    const rows = filteredRows.map((gp) => {
      const kembaliMs = parseTimeMs(gp.waktu_kembali);
      const criticalMinutes = Number.isFinite(kembaliMs)
        ? Math.max(0, Math.floor(Math.abs(now.getTime() - kembaliMs) / 60000))
        : 0;
      return [
        gp.id,
        gp.user?.nama ?? '-',
        gp.user?.nrp ?? '-',
        gp.user?.pangkat ?? '-',
        gp.user?.satuan ?? '-',
        getStatusLabel(gp.effectiveStatus),
        gp.tujuan,
        gp.keperluan,
        gp.waktu_keluar,
        gp.waktu_kembali,
        criticalMinutes,
      ].map(csvEscape).join(',');
    });

    const csv = [header.map(csvEscape).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const fileDate = new Date().toISOString().slice(0, 10);

    const a = document.createElement('a');
    a.href = url;
    a.download = `gatepass-monitor-${fileDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    if (filteredRows.length === 0) return;

    const rows = filteredRows
      .map((gp) => {
        const nama = gp.user?.nama ?? '-';
        const nrp = gp.user?.nrp ?? '-';
        const satuan = gp.user?.satuan ?? '-';
        return `
          <tr>
            <td>${nama}</td>
            <td>${nrp}</td>
            <td>${satuan}</td>
            <td>${getStatusLabel(gp.effectiveStatus)}</td>
            <td>${gp.tujuan}</td>
            <td>${formatDateTime(gp.waktu_keluar)}</td>
            <td>${formatDateTime(gp.waktu_kembali)}</td>
          </tr>
        `;
      })
      .join('');

    const popup = window.open('', '_blank', 'width=1200,height=800');
    if (!popup) return;

    popup.document.write(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Laporan Monitoring Gate Pass</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin: 0 0 8px 0; }
          p { margin: 0 0 16px 0; color: #4b5563; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>Laporan Monitoring Gate Pass</h1>
        <p>Dicetak: ${new Date().toLocaleString('id-ID')} | Total data: ${filteredRows.length}</p>
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>NRP</th>
              <th>Satuan</th>
              <th>Status</th>
              <th>Tujuan</th>
              <th>Waktu Keluar</th>
              <th>Batas Kembali</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  if (isInitialLoading) {
    return (
      <DashboardLayout title="Monitoring Gate Pass">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Monitoring Gate Pass">
      <div className="mx-auto max-w-5xl py-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Monitoring Gate Pass</h1>
            <p className="text-sm text-text-muted">Pantau alur terbaru: submit auto-approved, scan keluar (checked-in), dan scan kembali (completed).</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetFilters}>Reset Filter</Button>
            <Button variant="outline" onClick={handlePrintReport} disabled={filteredRows.length === 0}>Print Laporan</Button>
            <Button variant="outline" onClick={handleExportCsv} disabled={filteredRows.length === 0}>Export CSV</Button>
            <Button variant="outline" onClick={() => void handleRefresh()} isLoading={isRefreshing}>Muat Ulang</Button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-accent-red/40 bg-accent-red/10 px-4 py-3 text-sm text-accent-red">
            {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="app-card p-4">
            <div className="text-xs text-text-muted">Personil Tersedia</div>
            <div className="mt-1 text-2xl font-bold text-green-600">{personilTersedia}</div>
          </div>
          <div className="app-card p-4">
            <div className="text-xs text-text-muted">Personil di Luar</div>
            <div className="mt-1 text-2xl font-bold text-purple-500">{personilDiLuar}</div>
          </div>
          <div className="app-card p-4">
            <div className="text-xs text-text-muted">Siap scan keluar</div>
            <div className="mt-1 text-2xl font-bold text-blue-500">{approved}</div>
          </div>
          <div className="app-card p-4">
            <div className="text-xs text-text-muted">Checked-in</div>
            <div className="mt-1 text-2xl font-bold text-orange-500">{keluar}</div>
          </div>
          <div className="app-card p-4">
            <div className="text-xs text-text-muted">Completed</div>
            <div className="mt-1 text-2xl font-bold text-green-600">{completed}</div>
          </div>
          <div className="app-card p-4">
            <div className="text-xs text-text-muted">Overdue</div>
            <div className="mt-1 text-2xl font-bold text-pink-600">{overdue}</div>
          </div>
        </div>

        <div className="app-card p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <Input
              placeholder="Cari nama, NRP, tujuan, atau keperluan"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className="w-full rounded-xl border border-surface bg-bg-card px-3 py-2.5 text-sm text-text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as GatePassStatus | 'all')}
            >
              <option value="all">{getStatusLabel('all')}</option>
              <option value="approved">{getStatusLabel('approved')}</option>
              <option value="checked_in">{getStatusLabel('checked_in')}</option>
              <option value="overdue">{getStatusLabel('overdue')}</option>
              <option value="completed">{getStatusLabel('completed')}</option>
            </select>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input
              label="Tanggal keluar dari"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Tanggal keluar sampai"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => applyDatePreset(1)}>Hari ini</Button>
            <Button variant="ghost" size="sm" onClick={() => applyDatePreset(7)}>7 hari</Button>
            <Button variant="ghost" size="sm" onClick={() => applyDatePreset(30)}>30 hari</Button>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Urutan prioritas: overdue terlama, lalu checked-in terdekat batas kembali, lalu status lainnya.
          </p>
        </div>

        <div className="space-y-2" data-testid="monitor-list">
          {filteredRows.length === 0 && (
            <div className="rounded-xl border border-surface/80 bg-bg-card p-5 text-sm text-text-muted">
              Tidak ada data yang cocok dengan filter saat ini.
            </div>
          )}

          {filteredRows.map(gp => {
            const kembaliAt = gp.waktu_kembali ? new Date(gp.waktu_kembali) : null;
            const isValidKembali = kembaliAt && !Number.isNaN(kembaliAt.getTime());
            const deltaMs = isValidKembali ? Math.abs(kembaliAt.getTime() - now.getTime()) : 0;
            const showLate = gp.effectiveStatus === 'overdue' && isValidKembali;
            const showRemaining = gp.effectiveStatus === 'checked_in' && isValidKembali;

            return (
              <div
                key={gp.id}
                data-testid={`monitor-card-${gp.id}`}
                className={
                  gp.effectiveStatus === 'overdue'
                    ? 'rounded-xl border border-accent-red/40 bg-accent-red/5 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'
                    : 'rounded-xl border border-surface/80 bg-bg-card p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'
                }
              >
                <div className="space-y-1">
                  {gp.user && (
                    <div className="text-sm font-semibold text-primary">
                      {gp.user.nama} ({gp.user.nrp})
                    </div>
                  )}
                  <div className="font-bold text-text-primary">{gp.tujuan}</div>
                  <div className="text-sm text-text-muted">{gp.keperluan}</div>
                  <div className="text-xs text-text-muted">
                    Rencana keluar: {formatDateTime(gp.waktu_keluar)} | Batas kembali: {formatDateTime(gp.waktu_kembali)}
                  </div>
                  <div className="text-xs text-text-muted">
                    Scan keluar: {formatDateTime(gp.actual_keluar)} | Scan kembali: {formatDateTime(gp.actual_kembali)}
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-1.5">
                  <GatePassStatusBadge gatePass={{ ...gp, status: gp.effectiveStatus }} />
                  {showLate && <div className="text-xs font-semibold text-accent-red">Terlambat {formatDuration(deltaMs)}</div>}
                  {showRemaining && <div className="text-xs font-semibold text-orange-500">Sisa waktu {formatDuration(deltaMs)}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
