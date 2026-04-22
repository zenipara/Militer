import { useEffect, useMemo, useRef, useState } from 'react';
import { useGatePassStore } from '../../store/gatePassStore';
import { useGatePassRealtime } from '../../hooks/useGatePassRealtime';
import GatePassStatusBadge from '../../components/gatepass/GatePassStatusBadge';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { CardListSkeleton, StatCardsSkeleton } from '../../components/common/Skeleton';
import { useDebounce } from '../../hooks/useDebounce';
import type { GatePass, GatePassStatus } from '../../types';
import { supabase } from '../../lib/supabase';

interface MonitorGatePass extends GatePass {
  effectiveStatus: GatePassStatus;
}

type SortMode = 'priority' | 'latest';
type OverdueBucket = 'all' | 'over_30m' | 'over_1h' | 'over_3h' | 'over_6h';
type DisplayMode = 'cards' | 'table';
const DISPLAY_MODE_KEY = 'karyo_gatepass_monitor_display_mode';

function loadDisplayMode(): DisplayMode {
  try {
    const stored = localStorage.getItem(DISPLAY_MODE_KEY);
    return stored === 'table' ? 'table' : 'cards';
  } catch {
    return 'cards';
  }
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

function compareLatestFirst(a: MonitorGatePass, b: MonitorGatePass) {
  return parseTimeMs(b.waktu_keluar || b.created_at) - parseTimeMs(a.waktu_keluar || a.created_at);
}

function getOverdueDurationMs(gatePass: MonitorGatePass, now: Date): number | null {
  if (gatePass.effectiveStatus !== 'overdue') return null;
  const dueMs = parseTimeMs(gatePass.waktu_kembali);
  if (!Number.isFinite(dueMs)) return null;
  return Math.max(0, now.getTime() - dueMs);
}

function matchesOverdueBucket(gatePass: MonitorGatePass, bucket: OverdueBucket, now: Date): boolean {
  if (bucket === 'all') return true;
  const overdueMs = getOverdueDurationMs(gatePass, now);
  if (overdueMs === null) return false;

  const thresholdMs: Record<Exclude<OverdueBucket, 'all'>, number> = {
    over_30m: 30 * 60 * 1000,
    over_1h: 60 * 60 * 1000,
    over_3h: 3 * 60 * 60 * 1000,
    over_6h: 6 * 60 * 60 * 1000,
  };

  return overdueMs >= thresholdMs[bucket];
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

function buildCopyTextForGatePass(gatePass: MonitorGatePass) {
  const lines = [
    `Nama: ${gatePass.user?.nama ?? '-'}`,
    `NRP: ${gatePass.user?.nrp ?? '-'}`,
    `Satuan: ${gatePass.user?.satuan ?? '-'}`,
    `Status: ${gatePass.effectiveStatus}`,
    `Tujuan: ${gatePass.tujuan}`,
    `Keperluan: ${gatePass.keperluan}`,
    `Waktu keluar: ${formatDateTime(gatePass.waktu_keluar)}`,
    `Batas kembali: ${formatDateTime(gatePass.waktu_kembali)}`,
    `Scan keluar: ${formatDateTime(gatePass.actual_keluar)}`,
    `Scan kembali: ${formatDateTime(gatePass.actual_kembali)}`,
  ];

  return lines.join('\n');
}

function buildCopyTextForUnitSummary(item: { unit: string; total: number; overdue: number; checkedIn: number; approved: number }) {
  return [
    `Satuan: ${item.unit}`,
    `Total data: ${item.total}`,
    `Overdue: ${item.overdue}`,
    `Checked-in: ${item.checkedIn}`,
    `Approved: ${item.approved}`,
  ].join('\n');
}

export default function GatePassMonitorPage() {
  const gatePasses = useGatePassStore(s => s.gatePasses);
  const fetchGatePasses = useGatePassStore(s => s.fetchGatePasses);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GatePassStatus | 'all'>('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [overdueBucket, setOverdueBucket] = useState<OverdueBucket>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [criticalMode, setCriticalMode] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('priority');
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => loadDisplayMode());
  const [now, setNow] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [totalPersonil, setTotalPersonil] = useState(0);
  useGatePassRealtime();
  const debouncedQuery = useDebounce(query, 250);
  const copyFeedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DISPLAY_MODE_KEY, displayMode);
    } catch {
      // Ignore storage failures (private mode, quota issues)
    }
  }, [displayMode]);

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
        if (typeof supabase.rpc !== 'function') {
          setTotalPersonil(0);
        } else {
          const { data: totalCount, error: countError } = await supabase.rpc('api_count_active_users', {
            p_satuan: null,
          });
          if (countError) throw countError;
          setTotalPersonil((totalCount as number | null) ?? 0);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('Error fetching total personil:', err);
        }
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
    const q = debouncedQuery.trim().toLowerCase();
    const rows = monitorRows
      .filter(gp => {
        const statusMatch = statusFilter === 'all' || gp.effectiveStatus === statusFilter;
        if (!statusMatch) return false;
        const unitMatch = unitFilter === 'all' || gp.user?.satuan === unitFilter;
        if (!unitMatch) return false;
        const dateMatch = isWithinDateRange(gp.waktu_keluar || gp.created_at, startDate, endDate);
        if (!dateMatch) return false;
        if (criticalMode && gp.effectiveStatus !== 'overdue' && gp.effectiveStatus !== 'checked_in') return false;
        if (!matchesOverdueBucket(gp, overdueBucket, now)) return false;
        if (!q) return true;
        const haystack = [gp.user?.nama, gp.user?.nrp, gp.user?.satuan, gp.tujuan, gp.keperluan].join(' ').toLowerCase();
        return haystack.includes(q);
      });

    if (sortMode === 'latest') {
      return rows.sort(compareLatestFirst);
    }

    return rows.sort((a, b) => compareMonitorPriority(a, b, now));
  }, [monitorRows, debouncedQuery, statusFilter, unitFilter, startDate, endDate, criticalMode, overdueBucket, sortMode, now]);

  const monitorSummary = useMemo(() => {
    const unitMap = new Map<string, { unit: string; total: number; overdue: number; checkedIn: number; approved: number }>();
    const quickStatusStats = {
      all: 0,
      overdue: 0,
      checked_in: 0,
      approved: 0,
      completed: 0,
    };

    let approvedCount = 0;
    let keluarCount = 0;
    let completedCount = 0;
    let overdueCount = 0;
    let longestOverdue: MonitorGatePass | null = null;
    let longestOverdueMs = Number.NEGATIVE_INFINITY;
    let nearestDeadline: MonitorGatePass | null = null;
    let nearestDeadlineMs = Number.POSITIVE_INFINITY;

    for (const gatePass of monitorRows) {
      quickStatusStats.all += 1;

      const effectiveStatus = gatePass.effectiveStatus;
      if (effectiveStatus === 'overdue') {
        quickStatusStats.overdue += 1;
        overdueCount += 1;
      } else if (effectiveStatus === 'checked_in') {
        quickStatusStats.checked_in += 1;
        keluarCount += 1;
      } else if (effectiveStatus === 'approved') {
        quickStatusStats.approved += 1;
        approvedCount += 1;
      } else if (effectiveStatus === 'completed') {
        quickStatusStats.completed += 1;
        completedCount += 1;
      }

      const unit = gatePass.user?.satuan?.trim();
      if (unit) {
        const current = unitMap.get(unit) ?? { unit, total: 0, overdue: 0, checkedIn: 0, approved: 0 };
        current.total += 1;
        if (effectiveStatus === 'overdue') current.overdue += 1;
        if (effectiveStatus === 'checked_in') current.checkedIn += 1;
        if (effectiveStatus === 'approved') current.approved += 1;
        unitMap.set(unit, current);
      }

      if (effectiveStatus === 'overdue') {
        const dueMs = parseTimeMs(gatePass.waktu_kembali);
        if (Number.isFinite(dueMs) && dueMs < longestOverdueMs) {
          longestOverdueMs = dueMs;
          longestOverdue = gatePass;
        }
      }

      if (effectiveStatus === 'checked_in') {
        const dueMs = parseTimeMs(gatePass.waktu_kembali);
        if (Number.isFinite(dueMs) && dueMs < nearestDeadlineMs) {
          nearestDeadlineMs = dueMs;
          nearestDeadline = gatePass;
        }
      }
    }

    const unitSummary = Array.from(unitMap.values())
      .sort((a, b) => b.total - a.total || b.overdue - a.overdue || a.unit.localeCompare(b.unit, 'id-ID'))
      .slice(0, 6);

    const unitOptions = Array.from(unitMap.keys()).sort((a, b) => a.localeCompare(b, 'id-ID'));
    const diLuarCount = approvedCount + keluarCount + overdueCount;
    const tersediaCount = Math.max(0, totalPersonil - diLuarCount);

    return {
      quickStatusStats,
      unitSummary,
      unitOptions,
      longestOverdue,
      nearestDeadline,
      approved: approvedCount,
      keluar: keluarCount,
      completed: completedCount,
      overdue: overdueCount,
      personilDiLuar: diLuarCount,
      personilTersedia: tersediaCount,
    };
  }, [monitorRows, totalPersonil]);

  const filteredSummary = useMemo(() => {
    const summaryMap = new Map<string, { unit: string; total: number; overdue: number; checkedIn: number; approved: number }>();

    for (const row of filteredRows) {
      const unit = row.user?.satuan?.trim() || 'Tidak diketahui';
      const current = summaryMap.get(unit) ?? { unit, total: 0, overdue: 0, checkedIn: 0, approved: 0 };
      current.total += 1;
      if (row.effectiveStatus === 'overdue') current.overdue += 1;
      if (row.effectiveStatus === 'checked_in') current.checkedIn += 1;
      if (row.effectiveStatus === 'approved') current.approved += 1;
      summaryMap.set(unit, current);
    }

    return Array.from(summaryMap.values())
      .sort((a, b) => b.total - a.total || b.overdue - a.overdue || a.unit.localeCompare(b.unit, 'id-ID'))
      .slice(0, 6);
  }, [filteredRows]);

  const unitSummary = filteredSummary;
  const { quickStatusStats, unitOptions, longestOverdue, nearestDeadline, approved, keluar, completed, overdue, personilDiLuar, personilTersedia } = monitorSummary;

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

  const showCopyFeedback = (message: string) => {
    setCopyFeedback(message);
    if (copyFeedbackTimerRef.current) {
      window.clearTimeout(copyFeedbackTimerRef.current);
    }
    copyFeedbackTimerRef.current = window.setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleCopyText = async (text: string, message: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard tidak tersedia');
      await navigator.clipboard.writeText(text);
      showCopyFeedback(message);
    } catch {
      showCopyFeedback('Gagal menyalin ke clipboard');
    }
  };

  const resetFilters = () => {
    setQuery('');
    setStatusFilter('all');
    setUnitFilter('all');
    setOverdueBucket('all');
    setStartDate('');
    setEndDate('');
    setCriticalMode(false);
    setSortMode('priority');
    setDisplayMode('cards');
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

  const handleExportUnitSummaryCsv = () => {
    if (unitSummary.length === 0) return;

    const header = ['Satuan', 'Total Data', 'Overdue', 'Checked-in', 'Approved'];
    const rows = unitSummary.map((item) => [item.unit, item.total, item.overdue, item.checkedIn, item.approved].map(csvEscape).join(','));
    const csv = [header.map(csvEscape).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const fileDate = new Date().toISOString().slice(0, 10);

    const a = document.createElement('a');
    a.href = url;
    a.download = `gatepass-unit-summary-${fileDate}.csv`;
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
        <div className="mx-auto max-w-5xl py-6 space-y-6">
          <div className="space-y-3">
            <div className="h-8 w-72 animate-pulse rounded-lg bg-surface/70" />
            <div className="h-4 w-full max-w-xl animate-pulse rounded bg-surface/70" />
          </div>

          <StatCardsSkeleton />

          <div className="app-card p-4 space-y-4">
            <div className="h-4 w-40 animate-pulse rounded bg-surface/70" />
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="h-11 animate-pulse rounded-xl bg-surface/70" />
              <div className="h-11 animate-pulse rounded-xl bg-surface/70" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-11 animate-pulse rounded-xl bg-surface/70" />
              <div className="h-11 animate-pulse rounded-xl bg-surface/70" />
            </div>
          </div>

          <CardListSkeleton count={4} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Monitoring Gate Pass">
      <div className="mx-auto max-w-7xl py-6 space-y-6 lg:space-y-8">
        <PageHeader
          title="Monitoring Gate Pass"
          subtitle="Pantau alur terbaru: submit auto-approved, scan keluar, dan scan kembali. Statistik diprioritaskan agar personil yang keluar lebih mudah dipantau."
          meta={
            <>
              <span>{filteredRows.length} data tampil</span>
              <span>{personilTersedia} personil tersedia</span>
              <span>{personilDiLuar} personil di luar</span>
            </>
          }
          actions={
            <>
              <Button variant="outline" onClick={resetFilters} data-testid="gatepass-monitor-reset-filters">Reset Filter</Button>
              <Button variant="outline" onClick={handlePrintReport} disabled={filteredRows.length === 0}>Print Laporan</Button>
              <Button variant="outline" onClick={handleExportCsv} disabled={filteredRows.length === 0}>Export CSV</Button>
              <Button variant="outline" onClick={() => void handleRefresh()} isLoading={isRefreshing} data-testid="gatepass-monitor-refresh">Muat Ulang</Button>
            </>
          }
        />

        {error && (
          <div className="rounded-xl border border-accent-red/40 bg-accent-red/10 px-4 py-3 text-sm text-accent-red">
            {error}
          </div>
        )}

        {copyFeedback && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
            {copyFeedback}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="app-card p-4" data-testid="gatepass-stat-personil-tersedia">
            <div className="text-xs text-text-muted">Personil Tersedia</div>
            <div className="mt-1 text-2xl font-bold text-green-600">{personilTersedia}</div>
          </div>
          <div className="app-card p-4" data-testid="gatepass-stat-personil-di-luar">
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

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr] xl:items-start">
          <div className="app-card p-4 lg:p-5 lg:sticky lg:top-4 lg:self-start">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Intel Operasional</h2>
                <p className="text-xs text-text-muted">Fokus cepat untuk kasus paling kritis.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={criticalMode ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setCriticalMode((prev) => !prev)}
                  data-testid="gatepass-monitor-critical-mode"
                >
                  {criticalMode ? 'Mode Kritis Aktif' : 'Mode Fokus Kritis'}
                </Button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className="rounded-xl border border-surface/75 bg-surface/20 px-4 py-3">
                <p className="text-xs text-text-muted">Terlambat Terlama</p>
                {longestOverdue ? (
                  <>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{longestOverdue.user?.nama ?? 'Personil tidak diketahui'}</p>
                    <p className="text-xs text-accent-red">Terlambat {formatDuration(Math.max(0, now.getTime() - parseTimeMs(longestOverdue.waktu_kembali)))}</p>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-text-muted">Tidak ada kasus overdue.</p>
                )}
              </div>

              <div className="rounded-xl border border-surface/75 bg-surface/20 px-4 py-3">
                <p className="text-xs text-text-muted">Batas Kembali Terdekat</p>
                {nearestDeadline ? (
                  <>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{nearestDeadline.user?.nama ?? 'Personil tidak diketahui'}</p>
                    <p className="text-xs text-orange-500">Sisa {formatDuration(Math.max(0, parseTimeMs(nearestDeadline.waktu_kembali) - now.getTime()))}</p>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-text-muted">Tidak ada personil aktif di luar.</p>
                )}
              </div>
            </div>
          </div>

          <div className="app-card p-4 lg:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Ringkasan per Satuan</h2>
                <p className="text-xs text-text-muted">Distribusi gate pass pada hasil filter aktif.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-text-muted">{unitSummary.length} satuan tampil</div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportUnitSummaryCsv}
                  disabled={unitSummary.length === 0}
                  data-testid="gatepass-monitor-unit-summary-export"
                >
                  Export Ringkasan
                </Button>
              </div>
            </div>

            {unitSummary.length > 0 ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2" data-testid="gatepass-monitor-unit-summary">
                {unitSummary.map((item) => (
                  <div
                    key={item.unit}
                    role="button"
                    tabIndex={0}
                    aria-label={`Ringkasan ${item.unit}`}
                    className={`rounded-xl border p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                      unitFilter === item.unit
                        ? 'border-primary bg-primary/10'
                        : 'border-surface/75 bg-surface/20 hover:border-primary/60 hover:bg-primary/5'
                    }`}
                    aria-pressed={unitFilter === item.unit}
                    onClick={() => setUnitFilter((current) => (current === item.unit ? 'all' : item.unit))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setUnitFilter((current) => (current === item.unit ? 'all' : item.unit));
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{item.unit}</p>
                        <p className="text-xs text-text-muted">Total {item.total} data</p>
                      </div>
                      <div className="text-right text-xs text-text-muted">
                        <div><span className="font-semibold text-accent-red">{item.overdue}</span> overdue</div>
                        <div><span className="font-semibold text-orange-500">{item.checkedIn}</span> checked-in</div>
                        <div><span className="font-semibold text-blue-500">{item.approved}</span> approved</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void handleCopyText(buildCopyTextForUnitSummary(item), `Ringkasan ${item.unit} disalin`);
                        }}
                      >
                        Salin ringkasan
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setUnitFilter((current) => (current === item.unit ? 'all' : item.unit));
                        }}
                      >
                        Fokus unit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-surface/75 bg-bg-card px-4 py-5 text-sm text-text-muted">
                Tidak ada data untuk diringkas pada filter saat ini.
              </div>
            )}
          </div>
        </div>
        <div className="app-card p-4 lg:p-5 lg:sticky lg:top-4">
          <div className="flex items-center justify-between gap-3 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Filter dan pencarian</h2>
              <p className="text-xs text-text-muted">Gunakan filter untuk mempersempit daftar dan menemukan personil lebih cepat.</p>
            </div>
            <div className="text-xs font-medium text-text-muted">{filteredRows.length} hasil</div>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <Input
              placeholder="Cari nama, NRP, tujuan, atau keperluan"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as GatePassStatus | 'all')}
              data-testid="gatepass-monitor-status-filter"
            >
              <option value="all">{getStatusLabel('all')}</option>
              <option value="approved">{getStatusLabel('approved')}</option>
              <option value="checked_in">{getStatusLabel('checked_in')}</option>
              <option value="overdue">{getStatusLabel('overdue')}</option>
              <option value="completed">{getStatusLabel('completed')}</option>
            </select>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2" data-testid="gatepass-monitor-quick-status">
            {(
              [
                ['all', quickStatusStats.all],
                ['overdue', quickStatusStats.overdue],
                ['checked_in', quickStatusStats.checked_in],
                ['approved', quickStatusStats.approved],
                ['completed', quickStatusStats.completed],
              ] as Array<[GatePassStatus | 'all', number]>
            ).map(([status, total]) => {
              const active = statusFilter === status;
              return (
                <Button
                  key={status}
                  variant={active ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {getStatusLabel(status)} ({total})
                </Button>
              );
            })}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-muted">Satuan</label>
              <select
                className="form-control"
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                data-testid="gatepass-monitor-unit-filter"
              >
                <option value="all">Semua satuan</option>
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-muted">Durasi terlambat</label>
              <select
                className="form-control"
                value={overdueBucket}
                onChange={(e) => setOverdueBucket(e.target.value as OverdueBucket)}
                data-testid="gatepass-monitor-overdue-filter"
              >
                <option value="all">Semua durasi</option>
                <option value="over_30m">Terlambat &ge; 30 menit</option>
                <option value="over_1h">Terlambat &ge; 1 jam</option>
                <option value="over_3h">Terlambat &ge; 3 jam</option>
                <option value="over_6h">Terlambat &ge; 6 jam</option>
              </select>
            </div>
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
            <select
              className="form-control min-w-[210px]"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              data-testid="gatepass-monitor-sort-mode"
            >
              <option value="priority">Urutan prioritas operasi</option>
              <option value="latest">Urutan terbaru keluar</option>
            </select>
            <div className="ml-auto inline-flex rounded-xl border border-surface/75 bg-surface/20 p-1" data-testid="gatepass-monitor-display-mode">
              <Button
                size="sm"
                variant={displayMode === 'cards' ? 'secondary' : 'ghost'}
                onClick={() => setDisplayMode('cards')}
                aria-pressed={displayMode === 'cards'}
                data-testid="gatepass-monitor-display-cards"
              >
                Mode Kartu
              </Button>
              <Button
                size="sm"
                variant={displayMode === 'table' ? 'secondary' : 'ghost'}
                onClick={() => setDisplayMode('table')}
                aria-pressed={displayMode === 'table'}
                data-testid="gatepass-monitor-display-table"
              >
                Mode Tabel
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            {sortMode === 'priority'
              ? 'Urutan prioritas: overdue terlama, lalu checked-in terdekat batas kembali, lalu status lainnya.'
              : 'Urutan terbaru: data dengan waktu keluar paling baru ditampilkan lebih dulu.'}
          </p>
        </div>

        <div className="space-y-2" data-testid="monitor-list">
          {filteredRows.length === 0 && (
            <div className="rounded-2xl border border-dashed border-surface/80 bg-bg-card p-6 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                •
              </div>
              <h3 className="mt-3 text-base font-semibold text-text-primary">Tidak ada data yang cocok</h3>
              <p className="mt-1 text-sm text-text-muted">
                Coba ubah kata kunci, status, atau rentang tanggal. Jika perlu, reset filter untuk melihat semua data.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={resetFilters} data-testid="gatepass-monitor-reset-filters-empty">Reset Filter</Button>
                <Button variant="ghost" size="sm" onClick={() => void handleRefresh()} data-testid="gatepass-monitor-refresh-empty">Muat Ulang</Button>
              </div>
            </div>
          )}

          {filteredRows.length > 0 && displayMode === 'table' && (
            <div className="overflow-hidden rounded-2xl border border-surface/80 bg-bg-card shadow-sm" data-testid="monitor-table">
              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full text-sm">
                  <thead className="bg-surface/40 text-left text-xs uppercase tracking-[0.04em] text-text-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Personil</th>
                      <th className="px-4 py-3 font-semibold">Satuan</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Tujuan</th>
                      <th className="px-4 py-3 font-semibold">Rencana</th>
                      <th className="px-4 py-3 font-semibold">Scan</th>
                      <th className="px-4 py-3 font-semibold">Kritis</th>
                      <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((gp) => {
                      const kembaliAt = gp.waktu_kembali ? new Date(gp.waktu_kembali) : null;
                      const isValidKembali = kembaliAt && !Number.isNaN(kembaliAt.getTime());
                      const deltaMs = isValidKembali ? Math.abs(kembaliAt.getTime() - now.getTime()) : 0;
                      const showLate = gp.effectiveStatus === 'overdue' && isValidKembali;
                      const showRemaining = gp.effectiveStatus === 'checked_in' && isValidKembali;

                      return (
                        <tr key={gp.id} className="border-t border-surface/75 align-top hover:bg-primary/5">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-text-primary">{gp.user?.nama ?? 'Personil tidak diketahui'}</div>
                            <div className="text-xs text-text-muted">NRP: {gp.user?.nrp ?? '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-text-muted">{gp.user?.satuan ?? '-'}</td>
                          <td className="px-4 py-3"><GatePassStatusBadge gatePass={{ ...gp, status: gp.effectiveStatus }} /></td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-text-primary">{gp.tujuan}</div>
                            <div className="text-xs text-text-muted">{gp.keperluan}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-text-muted">
                            <div>Keluar: {formatDateTime(gp.waktu_keluar)}</div>
                            <div>Kembali: {formatDateTime(gp.waktu_kembali)}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-text-muted">
                            <div>Out: {formatDateTime(gp.actual_keluar)}</div>
                            <div>In: {formatDateTime(gp.actual_kembali)}</div>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold">
                            {showLate && <span className="text-accent-red">Terlambat {formatDuration(deltaMs)}</span>}
                            {showRemaining && <span className="text-orange-500">Sisa {formatDuration(deltaMs)}</span>}
                            {!showLate && !showRemaining && <span className="text-text-muted">Normal</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void handleCopyText(buildCopyTextForGatePass(gp), `Detail ${gp.user?.nama ?? gp.id} disalin`)}
                            >
                              Salin
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filteredRows.length > 0 && displayMode === 'cards' && filteredRows.map(gp => {
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleCopyText(buildCopyTextForGatePass(gp), `Detail ${gp.user?.nama ?? gp.id} disalin`)}
                  >
                    Salin detail
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
