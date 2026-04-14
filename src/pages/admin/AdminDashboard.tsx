import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard, { StatsGrid } from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/common/Button';
import { StatCardsSkeleton } from '../../components/common/Skeleton';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import type { AuditLog, Attendance } from '../../types';
import type { LogisticsItem } from '../../types';
import AttendanceHeatmap from '../../components/ui/AttendanceHeatmap';

interface DashboardStats {
  totalPersonel: number;
  totalOnline: number;
  totalTugas: number;
  tugasAktif: number;
  pendingIzin: number;
  absensiHariIni: number;
  absensiMasuk: number;
  pinnedPengumuman: number;
}

const actionLabels: Record<string, string> = {
  LOGIN: '🔑 Login',
  LOGOUT: '🚪 Logout',
  CREATE: '➕ Buat',
  UPDATE: '✏ Ubah',
  DELETE: '🗑 Hapus',
};

const quickLinks = [
  { href: '/admin/users', icon: '👥', title: 'Personel', desc: 'CRUD user & reset PIN' },
  { href: '/admin/logistics', icon: '📦', title: 'Logistik', desc: 'Inventaris perlengkapan' },
  { href: '/admin/documents', icon: '📄', title: 'Dokumen', desc: 'Arsip & unduh dokumen' },
  { href: '/admin/announcements', icon: '📢', title: 'Pengumuman', desc: 'Broadcast & pin' },
  { href: '/admin/schedule', icon: '📅', title: 'Jadwal Shift', desc: 'Atur shift personel' },
  { href: '/admin/attendance', icon: '✅', title: 'Rekap Absensi', desc: 'Laporan & export CSV' },
  { href: '/admin/audit', icon: '📋', title: 'Audit Log', desc: 'Riwayat aktivitas' },
  { href: '/admin/settings', icon: '⚙', title: 'Pengaturan', desc: 'Konfigurasi sistem' },
];

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const { dashboardAutoRefreshEnabled, dashboardAutoRefreshMinutes, showNotification } = useUIStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LogisticsItem[]>([]);
  const [heatmapAttendances, setHeatmapAttendances] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      const [
        usersResult,
        tasksResult,
        onlineResult,
        activeTasksResult,
        pendingLeaveResult,
        attendanceTotalResult,
        attendancePresentResult,
        pinnedAnnouncementsResult,
        logisticsResult,
        logsResult,
        heatmapResult,
      ] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('tasks').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_online', true),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']),
        supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('tanggal', today),
        supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('tanggal', today).eq('status', 'hadir'),
        supabase.from('announcements').select('id', { count: 'exact', head: true }).eq('is_pinned', true),
        supabase.from('logistics_items').select('id, nama_item, jumlah, kondisi, kategori, lokasi, satuan_item').order('jumlah', { ascending: true }),
        supabase
          .from('audit_logs')
          .select('*, user:user_id(id,nama,nrp,role)')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('attendance')
          .select('*, user:user_id(id,nama,nrp,pangkat)')
          .gte('tanggal', thirtyDaysAgoStr)
          .lte('tanggal', today)
          .order('tanggal', { ascending: false }),
      ]);

      const logisticsItems = (logisticsResult.data as LogisticsItem[]) ?? [];
      const lowStock = logisticsItems.filter((item) => item.jumlah <= 5 || item.kondisi !== 'baik');

      setStats({
        totalPersonel: usersResult.count ?? 0,
        totalOnline: onlineResult.count ?? 0,
        totalTugas: tasksResult.count ?? 0,
        tugasAktif: activeTasksResult.count ?? 0,
        pendingIzin: pendingLeaveResult.count ?? 0,
        absensiHariIni: attendanceTotalResult.count ?? 0,
        absensiMasuk: attendancePresentResult.count ?? 0,
        pinnedPengumuman: pinnedAnnouncementsResult.count ?? 0,
      });
      setRecentLogs((logsResult.data as AuditLog[]) ?? []);
      setHeatmapAttendances((heatmapResult.data as Attendance[]) ?? []);
      setLowStockItems(lowStock);
      setLastUpdated(new Date());
      return true;
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Gagal memuat dashboard');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!dashboardAutoRefreshEnabled) return undefined;
    const intervalId = window.setInterval(() => {
      void fetchData();
    }, dashboardAutoRefreshMinutes * 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [dashboardAutoRefreshEnabled, dashboardAutoRefreshMinutes, fetchData]);

  // Gunakan ref agar tidak terjadi duplicate subscription
  const channelRef = useRef(null);

  useEffect(() => {
    // Cleanup channel sebelumnya jika ada
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => { void fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => { void fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => { void fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => { void fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => { void fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logistics_items' }, () => { void fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => { void fetchData(); })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchData]);

  const handleRefresh = async () => {
    const ok = await fetchData();
    if (ok) {
      showNotification('Ringkasan dashboard diperbarui', 'success');
    } else {
      showNotification('Gagal memuat dashboard', 'error');
    }
  };

  const attendanceRate = stats && stats.absensiHariIni > 0
    ? Math.round((stats.absensiMasuk / stats.absensiHariIni) * 100)
    : 0;

  const operationalHighlights = stats
    ? [
        { label: 'Absensi hari ini', value: `${stats.absensiMasuk}/${stats.absensiHariIni}`, hint: `${attendanceRate}% hadir` },
        { label: 'Izin pending', value: String(stats.pendingIzin), hint: 'Menunggu persetujuan' },
        { label: 'Pengumuman pin', value: String(stats.pinnedPengumuman), hint: 'Tersemat di feed' },
        { label: 'Stok rendah', value: String(lowStockItems.length), hint: 'Perlu pengecekan' },
      ]
    : [];

  return (
    <DashboardLayout title="Pusat Kendali">
      <div className="space-y-6">
        <PageHeader
          title={`Selamat datang, ${user?.nama ?? 'Komandan'}`}
          subtitle={new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          meta={
            <>
              <span>{dashboardAutoRefreshEnabled ? `Auto refresh aktif setiap ${dashboardAutoRefreshMinutes} menit` : 'Auto refresh nonaktif'}</span>
              {lastUpdated && <span>Terakhir diperbarui {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
            </>
          }
          actions={<Button variant="outline" onClick={() => void handleRefresh()} isLoading={isLoading}>Muat Ulang</Button>}
        />

        {error && (
          <div className="rounded-xl border border-accent-red/40 bg-accent-red/10 p-4 text-sm text-accent-red">
            {error}
          </div>
        )}

        {/* Stats */}
        {isLoading ? (
          <StatCardsSkeleton />
        ) : (
          <StatsGrid>
            <StatCard icon="👥" label="Total Personel Aktif" value={stats?.totalPersonel ?? 0} />
            <StatCard icon="🟢" label="Sedang Online" value={stats?.totalOnline ?? 0} trend="saat ini" trendUp />
            <StatCard icon="📋" label="Total Tugas" value={stats?.totalTugas ?? 0} />
            <StatCard icon="⏳" label="Tugas Aktif" value={stats?.tugasAktif ?? 0} />
          </StatsGrid>
        )}

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="app-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-text-primary">Pusat Tindakan Cepat</h3>
                  <p className="text-sm text-text-muted">Akses langsung ke modul yang paling sering dipakai admin.</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                {quickLinks.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="rounded-xl border border-surface/80 bg-bg-card/90 p-4 transition-colors hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-surface/35"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xl">{item.icon}</span>
                      <h3 className="font-semibold text-text-primary text-sm transition-colors">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-xs text-text-muted">{item.desc}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="app-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-text-primary">Pantauan Operasional</h3>
                  <p className="text-sm text-text-muted">Ringkasan yang langsung berguna untuk pengambilan keputusan.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {operationalHighlights.map((item) => (
                  <div key={item.label} className="rounded-xl border border-surface/80 bg-surface/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{item.label}</p>
                    <p className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary">{item.value}</p>
                    <p className="mt-1 text-xs text-text-muted">{item.hint}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-surface/80 bg-bg-card/90 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-text-primary">Stok Perlu Perhatian</h4>
                  <span className="text-xs text-text-muted">{lowStockItems.length} item</span>
                </div>
                {lowStockItems.length === 0 ? (
                  <p className="mt-3 text-sm text-text-muted">Tidak ada item logistik yang berada pada level kritis.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {lowStockItems.slice(0, 4).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-surface/70 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text-primary">{item.nama_item}</p>
                          <p className="text-xs text-text-muted">{item.kategori ?? 'Umum'}{item.lokasi ? ` · ${item.lokasi}` : ''}</p>
                        </div>
                        <span className={`text-sm font-semibold ${item.jumlah <= 3 || item.kondisi === 'rusak_berat' ? 'text-accent-red' : 'text-accent-gold'}`}>
                          {item.jumlah} {item.satuan_item ?? 'unit'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="app-card overflow-hidden p-0">
            <div className="px-5 py-4 border-b border-surface flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-text-primary">Aktivitas Terbaru</h3>
                <p className="text-xs text-text-muted">Audit log terakhir yang masuk dari sistem.</p>
              </div>
              <Link to="/admin/audit" className="text-xs text-primary hover:underline">Lihat semua →</Link>
            </div>
            <div className="divide-y divide-surface/50">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <div className="h-8 w-8 rounded-full animate-pulse bg-surface/70 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 animate-pulse bg-surface/70 rounded w-3/4" />
                      <div className="h-3 animate-pulse bg-surface/70 rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : recentLogs.length === 0 ? (
                <p className="text-center text-text-muted py-6 text-sm">Belum ada aktivitas tercatat</p>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                      {(log.user?.nama ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary">
                        <span className="font-medium">{log.user?.nama ?? '—'}</span>
                        {' '}
                        <span className="text-text-muted">{actionLabels[log.action] ?? log.action}</span>
                        {log.resource && <span className="text-text-muted"> · {log.resource}</span>}
                      </p>
                      <p className="text-xs text-text-muted">
                        {new Date(log.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="app-card p-5">
            <h3 className="text-lg font-bold text-text-primary">Statistik Kehadiran</h3>
            <p className="text-sm text-text-muted">Visualisasi 30 hari terakhir untuk monitoring tren disiplin kehadiran.</p>
            <div className="mt-4">
              <AttendanceHeatmap attendances={heatmapAttendances} />
            </div>
          </div>
          <div className="app-card p-5">
            <h3 className="text-lg font-bold text-text-primary">Metrik Sistem</h3>
            <p className="text-sm text-text-muted">Ringkasan cepat untuk status operasional saat ini.</p>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Kepatuhan absensi', value: `${attendanceRate}%` },
                { label: 'Task throughput', value: `${stats?.tugasAktif ?? 0}/${stats?.totalTugas ?? 0}` },
                { label: 'Online coverage', value: `${stats?.totalOnline ?? 0}/${stats?.totalPersonel ?? 0}` },
              ].map((metric) => (
                <div key={metric.label} className="rounded-xl border border-surface/80 bg-slate-50 px-4 py-3 dark:bg-surface/20">
                  <p className="text-xs text-text-muted">{metric.label}</p>
                  <p className="text-xl font-semibold text-text-primary">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
