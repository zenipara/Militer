import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard, { StatsGrid } from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/common/Button';
import ConfirmModal from '../../components/common/ConfirmModal';
import EmptyState from '../../components/common/EmptyState';
import WeatherWidget from '../../components/ui/WeatherWidget';
import { StatCardsSkeleton } from '../../components/common/Skeleton';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import AttendanceHeatmap from '../../components/ui/AttendanceHeatmap';
import type { IconName } from '../../icons';
import { ICONS } from '../../icons';
import { useAdminDashboardStore } from '../../store/adminDashboardStore';
import { subscribeDataChanges } from '../../lib/dataSync';
import { useUsers } from '../../hooks/useUsers';
import { useFeatureStore } from '../../store/featureStore';
import { usePlatformStore } from '../../store/platformStore';
import { isPathEnabled } from '../../lib/featureFlags';

const actionLabels: Record<string, string> = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  CREATE: 'Buat',
  UPDATE: 'Ubah',
  DELETE: 'Hapus',
};

interface QuickLink {
  href: string;
  icon: IconName;
  title: string;
  desc: string;
}

const quickLinks: QuickLink[] = [
  { href: '/admin/users', icon: 'UsersRound', title: 'Personel', desc: 'CRUD user & reset PIN' },
  { href: '/admin/analytics', icon: 'TrendingUp', title: 'Analitik', desc: 'Tren tugas, absensi & personel' },
  { href: '/admin/logistics', icon: 'Package', title: 'Logistik', desc: 'Inventaris perlengkapan' },
  { href: '/admin/gatepass-monitor', icon: 'ClipboardCheck', title: 'Gate Pass', desc: 'Monitoring keluar/masuk batalion' },
  { href: '/admin/pos-jaga', icon: 'MapPin', title: 'Pos Jaga', desc: 'Kelola pos jaga & QR statis' },
  { href: '/admin/documents', icon: 'FileText', title: 'Dokumen', desc: 'Arsip & unduh dokumen' },
  { href: '/admin/announcements', icon: 'Megaphone', title: 'Pengumuman', desc: 'Broadcast & pin' },
  { href: '/admin/schedule', icon: 'CalendarDays', title: 'Jadwal Shift', desc: 'Atur shift personel' },
  { href: '/admin/attendance', icon: 'BadgeCheck', title: 'Rekap Absensi', desc: 'Laporan & export CSV' },
  { href: '/admin/audit', icon: 'ScrollText', title: 'Audit Log', desc: 'Riwayat aktivitas' },
  { href: '/admin/settings', icon: 'Settings', title: 'Pengaturan', desc: 'Konfigurasi sistem' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { dashboardAutoRefreshEnabled, dashboardAutoRefreshMinutes, showNotification } = useUIStore();
  const { flags } = useFeatureStore();
  const { weatherSettings } = usePlatformStore();
  const { users: latestUsers, isLoading: isMembersLoading, deleteUser } = useUsers({
    orderBy: 'created_at',
    ascending: false,
    serverPaginated: true,
    page: 1,
    pageSize: 6,
  });
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [confirmMember, setConfirmMember] = useState<{ id: string; nama: string } | null>(null);
  const pendingRefreshWhileHiddenRef = useRef(false);
  const {
    snapshot,
    isLoading,
    isRefreshing,
    error,
    fetchDashboard,
    refreshDashboard,
  } = useAdminDashboardStore();

  const stats = snapshot?.stats ?? null;
  const recentLogs = snapshot?.recentLogs ?? [];
  const lowStockItems = snapshot?.lowStockItems ?? [];
  const heatmapAttendances = snapshot?.heatmapAttendances ?? [];
  const gatePassStats = snapshot?.gatePassStats ?? { checkedIn: 0, completed: 0, overdue: 0 };
  const lastUpdated = snapshot?.fetchedAt ? new Date(snapshot.fetchedAt) : null;

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!dashboardAutoRefreshEnabled) return undefined;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void refreshDashboard();
    }, dashboardAutoRefreshMinutes * 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [dashboardAutoRefreshEnabled, dashboardAutoRefreshMinutes, refreshDashboard]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (!pendingRefreshWhileHiddenRef.current) return;
      pendingRefreshWhileHiddenRef.current = false;
      void refreshDashboard();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshDashboard]);

  useEffect(() => {
    return subscribeDataChanges(
      ['users', 'tasks', 'leave_requests', 'attendance', 'announcements', 'logistics_items', 'audit_logs', 'gate_pass'],
      () => {
        if (document.visibilityState !== 'visible') {
          pendingRefreshWhileHiddenRef.current = true;
          return;
        }
        void refreshDashboard();
      },
      { debounceMs: 450 },
    );
  }, [refreshDashboard]);

  const handleRefresh = async () => {
    const ok = await refreshDashboard();
    if (ok) {
      showNotification('Ringkasan dashboard diperbarui', 'success');
    } else {
      showNotification('Gagal memuat dashboard', 'error');
    }
  };

  const handleDeleteMember = (targetId: string, targetName: string) => {
    if (!isUserManagementEnabled) {
      showNotification('Fitur manajemen personel sedang dinonaktifkan admin', 'warning');
      return;
    }

    if (!user) return;
    if (user.id === targetId) {
      showNotification('Tidak dapat menghapus akun sendiri', 'error');
      return;
    }

    setConfirmMember({ id: targetId, nama: targetName });
  };

  const handleConfirmDeleteMember = async () => {
    if (!confirmMember) return;
    const { id, nama } = confirmMember;
    setConfirmMember(null);
    setDeletingUserId(id);
    try {
      await deleteUser(id);
      showNotification(`Data anggota ${nama} berhasil dihapus`, 'success');
      void refreshDashboard();
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal menghapus anggota', 'error');
    } finally {
      setDeletingUserId(null);
    }
  };

  const attendanceRate = useMemo(() => (
    stats && stats.absensiHariIni > 0
      ? Math.round((stats.absensiMasuk / stats.absensiHariIni) * 100)
      : 0
  ), [stats]);

  const operationalHighlights = useMemo(() => {
    if (!stats) return [];
    return [
      { label: 'Absensi hari ini', value: `${stats.absensiMasuk}/${stats.absensiHariIni}`, hint: `${attendanceRate}% hadir` },
      { label: 'Izin pending', value: String(stats.pendingIzin), hint: 'Menunggu persetujuan' },
      { label: 'Gate Pass checked-in', value: String(gatePassStats.checkedIn), hint: 'Sudah scan keluar' },
      { label: 'Gate Pass completed', value: String(gatePassStats.completed), hint: 'Sudah scan kembali' },
      { label: 'Gate Pass overdue', value: String(gatePassStats.overdue), hint: 'Terlambat kembali' },
      { label: 'Pengumuman pin', value: String(stats.pinnedPengumuman), hint: 'Tersemat di feed' },
      { label: 'Stok rendah', value: String(lowStockItems.length), hint: 'Perlu pengecekan' },
    ];
  }, [attendanceRate, gatePassStats.completed, gatePassStats.checkedIn, gatePassStats.overdue, lowStockItems.length, stats]);

  const enabledQuickLinks = useMemo(() => quickLinks.filter((item) => isPathEnabled(item.href, flags)), [flags]);
  const isUserManagementEnabled = flags.user_management !== false;

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
          actions={<Button variant="outline" onClick={() => void handleRefresh()} isLoading={isLoading || isRefreshing}>Muat Ulang</Button>}
        />

        {enabledQuickLinks.length > 0 && (
          <div className="dashboard-quick-strip">
            {enabledQuickLinks.slice(0, 3).map((item) => {
              const Icon = ICONS[item.icon];
              return (
                <Link
                  key={`primary-${item.href}`}
                  to={item.href}
                  className="dashboard-quick-link group"
                >
                  <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="truncate">{item.title}</span>
                </Link>
              );
            })}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-accent-red/40 bg-accent-red/10 p-4 text-sm text-accent-red">
            {error}
          </div>
        )}

        {/* Weather Widget */}
        <WeatherWidget
          apiKey={weatherSettings.weatherApiKey || null}
          city={weatherSettings.weatherCity || null}
          onConfigureClick={() => navigate('/admin/settings')}
        />

        {/* Stats */}
        {isLoading ? (
          <StatCardsSkeleton />
        ) : (
          <StatsGrid>
            <StatCard accent="blue" icon={<ICONS.UsersRound className="h-5 w-5 text-primary" aria-hidden="true" />} label="Total Personel Aktif" value={stats?.totalPersonel ?? 0} />
            <StatCard accent="green" icon={<ICONS.UserCheck className="h-5 w-5 text-success" aria-hidden="true" />} label="Sedang Online" value={stats?.totalOnline ?? 0} trend="saat ini" trendUp />
            <StatCard accent="blue" icon={<ICONS.ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />} label="Total Tugas" value={stats?.totalTugas ?? 0} />
            <StatCard accent="gold" icon={<ICONS.Clipboard className="h-5 w-5 text-accent-gold" aria-hidden="true" />} label="Tugas Aktif" value={stats?.tugasAktif ?? 0} />
          </StatsGrid>
        )}

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="app-card p-5">
              <div className="panel-heading">
                <div>
                  <h3 className="panel-heading__title">Pusat Tindakan Cepat</h3>
                  <p className="panel-heading__desc">Akses langsung ke modul yang paling sering dipakai admin.</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-3">
                {enabledQuickLinks.map((item) => {
                  const Icon = ICONS[item.icon];
                  return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="group rounded-2xl border border-surface/70 bg-bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg dark:hover:bg-surface/30"
                  >
                    <div className="mb-2 flex items-center gap-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-xl border border-surface/60 bg-gradient-to-br from-primary/12 to-primary/4 text-primary transition-transform duration-200 group-hover:scale-110 shadow-sm">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <h3 className="font-semibold text-text-primary text-sm">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-xs text-text-muted">{item.desc}</p>
                  </Link>
                  );
                })}
                {enabledQuickLinks.length === 0 && (
                  <div className="col-span-full rounded-xl border border-surface/80 bg-surface/20 p-4 text-sm text-text-muted">
                    Semua modul tindakan cepat sedang dinonaktifkan oleh admin.
                  </div>
                )}
              </div>
            </div>

            <div className="app-card p-5">
              <div className="panel-heading">
                <div>
                  <h3 className="panel-heading__title">Pantauan Operasional</h3>
                  <p className="panel-heading__desc">Ringkasan yang langsung berguna untuk pengambilan keputusan.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {operationalHighlights.map((item) => (
                  <div key={item.label} className="group rounded-2xl border border-surface/70 bg-surface/15 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-surface/20 hover:shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-text-muted">{item.label}</p>
                    <p className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary">{item.value}</p>
                    <p className="mt-1 text-xs text-text-muted">{item.hint}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-surface/70 bg-bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-text-primary flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-accent-red/10 text-accent-red">
                      <ICONS.AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    Stok Perlu Perhatian
                  </h4>
                  <span className="rounded-full border border-surface/70 bg-surface/30 px-2 py-0.5 text-xs font-semibold text-text-muted">{lowStockItems.length} item</span>
                </div>
                {lowStockItems.length === 0 ? (
                  <EmptyState
                    title="Tidak ada item kritis"
                    description="Semua stok berada pada level aman. Pantau kembali setelah ada pembaruan logistik."
                    className="mt-3 border-0 bg-transparent px-0 py-4"
                  />
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

            {isUserManagementEnabled && (
              <div className="app-card p-5">
                <div className="panel-heading">
                  <div>
                    <h3 className="panel-heading__title">Hapus Anggota Cepat</h3>
                    <p className="panel-heading__desc">Kelola anggota terbaru langsung dari dashboard admin.</p>
                  </div>
                  <Link to="/admin/users" className="text-xs text-primary hover:underline">Kelola lengkap →</Link>
                </div>

                <div className="mt-4 space-y-2">
                  {isMembersLoading ? (
                    <p className="text-sm text-text-muted">Memuat data anggota...</p>
                  ) : latestUsers.length === 0 ? (
                    <EmptyState
                      title="Belum ada data anggota"
                      description="Daftar personel terbaru akan tampil di sini setelah data pengguna tersedia."
                      className="border-0 bg-transparent px-0 py-4"
                    />
                  ) : (
                    latestUsers.slice(0, 6).map((member) => (
                      <div key={member.id} className="flex items-center justify-between gap-3 rounded-2xl border border-surface/60 bg-surface/15 px-3 py-2.5 transition-colors hover:border-surface/80">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-blue-600/10 text-sm font-bold text-primary">
                            {member.nama.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-text-primary">{member.nama}</p>
                            <p className="text-xs text-text-muted">NRP {member.nrp} · {member.role}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={member.id === user?.id || deletingUserId === member.id}
                          onClick={() => handleDeleteMember(member.id, member.nama)}
                          isLoading={deletingUserId === member.id}
                        >
                          Hapus
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="app-card overflow-hidden p-0">
            <div className="px-5 py-4 border-b border-surface/60 flex items-center justify-between bg-surface/10">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
                  <ICONS.ScrollText className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-bold text-text-primary text-sm">Aktivitas Terbaru</h3>
                  <p className="text-xs text-text-muted">Audit log terakhir dari sistem.</p>
                </div>
              </div>
              <Link to="/admin/audit" className="text-xs font-medium text-primary hover:underline">Lihat semua →</Link>
            </div>
            <div className="divide-y divide-surface/40">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <div className="h-9 w-9 rounded-full animate-pulse bg-surface/70 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 animate-pulse bg-surface/70 rounded w-3/4" />
                      <div className="h-3 animate-pulse bg-surface/70 rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : recentLogs.length === 0 ? (
                <EmptyState
                  title="Belum ada aktivitas tercatat"
                  description="Audit log akan muncul otomatis saat ada interaksi di sistem."
                  className="border-0 bg-transparent px-0 py-8"
                />
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface/10">
                    <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-blue-600/10 text-primary text-xs font-bold">
                      {(log.user?.nama ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary">
                        <span className="font-semibold">{log.user?.nama ?? '—'}</span>
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
            <div className="flex items-center gap-2 mb-1">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-success/10 text-success">
                <ICONS.BarChart2 className="h-4 w-4" aria-hidden="true" />
              </span>
              <h3 className="text-base font-bold text-text-primary">Metrik Sistem</h3>
            </div>
            <p className="text-sm text-text-muted">Ringkasan status operasional saat ini.</p>
            <div className="mt-4 space-y-2.5">
              {[
                { label: 'Kepatuhan absensi', value: `${attendanceRate}%`, accent: attendanceRate >= 80 ? 'text-success' : attendanceRate >= 50 ? 'text-accent-gold' : 'text-accent-red' },
                { label: 'Task throughput', value: `${stats?.tugasAktif ?? 0}/${stats?.totalTugas ?? 0}`, accent: 'text-primary' },
                { label: 'Online coverage', value: `${stats?.totalOnline ?? 0}/${stats?.totalPersonel ?? 0}`, accent: 'text-primary' },
              ].map((metric) => (
                <div key={metric.label} className="metric-row">
                  <p className="text-sm text-text-muted">{metric.label}</p>
                  <p className={`text-xl font-bold ${metric.accent}`}>{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Delete Member Modal */}
      <ConfirmModal
        isOpen={confirmMember !== null}
        onClose={() => setConfirmMember(null)}
        onConfirm={() => { void handleConfirmDeleteMember(); }}
        title="Hapus Anggota"
        message={`Hapus data anggota ${confirmMember?.nama ?? ''}? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus"
      />
    </DashboardLayout>
  );
}
