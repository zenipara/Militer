import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard, { StatsGrid } from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/common/Button';
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
  const { user } = useAuthStore();
  const { dashboardAutoRefreshEnabled, dashboardAutoRefreshMinutes, showNotification } = useUIStore();
  const { flags } = useFeatureStore();
  const { users: latestUsers, isLoading: isMembersLoading, deleteUser } = useUsers({ orderBy: 'created_at', ascending: false });
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
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
  const gatePassStats = snapshot?.gatePassStats ?? { out: 0, overdue: 0 };
  const lastUpdated = snapshot?.fetchedAt ? new Date(snapshot.fetchedAt) : null;

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!dashboardAutoRefreshEnabled) return undefined;
    const intervalId = window.setInterval(() => {
      void refreshDashboard();
    }, dashboardAutoRefreshMinutes * 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [dashboardAutoRefreshEnabled, dashboardAutoRefreshMinutes, refreshDashboard]);

  useEffect(() => {
    return subscribeDataChanges(
      ['users', 'tasks', 'leave_requests', 'attendance', 'announcements', 'logistics_items', 'audit_logs', 'gate_pass'],
      () => {
        void refreshDashboard();
      },
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

  const handleDeleteMember = async (targetId: string, targetName: string) => {
    if (!isUserManagementEnabled) {
      showNotification('Fitur manajemen personel sedang dinonaktifkan admin', 'warning');
      return;
    }

    if (!user) return;
    if (user.id === targetId) {
      showNotification('Tidak dapat menghapus akun sendiri', 'error');
      return;
    }

    const confirmed = window.confirm(`Hapus data anggota ${targetName}? Tindakan ini tidak dapat dibatalkan.`);
    if (!confirmed) return;

    setDeletingUserId(targetId);
    try {
      await deleteUser(targetId);
      showNotification(`Data anggota ${targetName} berhasil dihapus`, 'success');
      void refreshDashboard();
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal menghapus anggota', 'error');
    } finally {
      setDeletingUserId(null);
    }
  };

  const attendanceRate = stats && stats.absensiHariIni > 0
    ? Math.round((stats.absensiMasuk / stats.absensiHariIni) * 100)
    : 0;

  const operationalHighlights = stats
    ? [
        { label: 'Absensi hari ini', value: `${stats.absensiMasuk}/${stats.absensiHariIni}`, hint: `${attendanceRate}% hadir` },
        { label: 'Izin pending', value: String(stats.pendingIzin), hint: 'Menunggu persetujuan' },
        { label: 'Gate Pass keluar', value: String(gatePassStats.out), hint: 'Sedang di luar' },
        { label: 'Gate Pass overdue', value: String(gatePassStats.overdue), hint: 'Terlambat kembali' },
        { label: 'Pengumuman pin', value: String(stats.pinnedPengumuman), hint: 'Tersemat di feed' },
        { label: 'Stok rendah', value: String(lowStockItems.length), hint: 'Perlu pengecekan' },
      ]
    : [];

  const enabledQuickLinks = quickLinks.filter((item) => isPathEnabled(item.href, flags));
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
            <StatCard icon={<ICONS.UsersRound className="h-5 w-5 text-primary" aria-hidden="true" />} label="Total Personel Aktif" value={stats?.totalPersonel ?? 0} />
            <StatCard icon={<ICONS.UserCheck className="h-5 w-5 text-success" aria-hidden="true" />} label="Sedang Online" value={stats?.totalOnline ?? 0} trend="saat ini" trendUp />
            <StatCard icon={<ICONS.ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />} label="Total Tugas" value={stats?.totalTugas ?? 0} />
            <StatCard icon={<ICONS.Clipboard className="h-5 w-5 text-accent-gold" aria-hidden="true" />} label="Tugas Aktif" value={stats?.tugasAktif ?? 0} />
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
                {enabledQuickLinks.map((item) => {
                  const Icon = ICONS[item.icon];
                  return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="rounded-xl border border-surface/80 bg-bg-card/90 p-4 transition-colors hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-surface/35"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="grid h-8 w-8 place-items-center rounded-lg border border-surface/80 bg-slate-50 text-primary dark:bg-surface/35">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <h3 className="font-semibold text-text-primary text-sm transition-colors">
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

            {isUserManagementEnabled && (
              <div className="app-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">Hapus Anggota Cepat</h3>
                    <p className="text-sm text-text-muted">Kelola anggota terbaru langsung dari dashboard admin.</p>
                  </div>
                  <Link to="/admin/users" className="text-xs text-primary hover:underline">Kelola lengkap →</Link>
                </div>

                <div className="mt-4 space-y-2">
                  {isMembersLoading ? (
                    <p className="text-sm text-text-muted">Memuat data anggota...</p>
                  ) : latestUsers.length === 0 ? (
                    <p className="text-sm text-text-muted">Belum ada data anggota.</p>
                  ) : (
                    latestUsers.slice(0, 6).map((member) => (
                      <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl border border-surface/70 bg-surface/20 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text-primary">{member.nama}</p>
                          <p className="text-xs text-text-muted">NRP {member.nrp} · {member.role}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={member.id === user?.id || deletingUserId === member.id}
                          onClick={() => void handleDeleteMember(member.id, member.nama)}
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
