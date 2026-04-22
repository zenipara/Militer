import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard, { StatsGrid } from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { StatCardsSkeleton, CardListSkeleton } from '../../components/common/Skeleton';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { useFeatureStore } from '../../store/featureStore';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import { isPathEnabled } from '../../lib/featureFlags';
import { ICONS } from '../../icons';
import { supabase } from '../../lib/supabase';
import { subscribeDataChanges } from '../../lib/dataSync';
import { ensureStoredSessionContext } from '../../lib/api/sessionContext';
import { useVisibilityAwareRefresh } from '../../hooks/useVisibilityAwareRefresh';

interface StafStats {
  totalPersonel: number;
  hadirHariIni: number;
  tugasAktif: number;
  logistikPending: number;
}

const EMPTY_STATS: StafStats = {
  totalPersonel: 0,
  hadirHariIni: 0,
  tugasAktif: 0,
  logistikPending: 0,
};

async function fetchStafStats(satuan: string): Promise<StafStats> {
  await ensureStoredSessionContext();
  const { data, error } = await supabase.rpc('api_get_staf_stats', {
    p_satuan: satuan,
  });

  if (error) throw error;

  const row = ((data as Array<{
    total_personel: number;
    hadir_hari_ini: number;
    tugas_aktif: number;
    logistik_pending: number;
  }>) ?? [])[0];

  return {
    totalPersonel: row?.total_personel ?? 0,
    hadirHariIni: row?.hadir_hari_ini ?? 0,
    tugasAktif: row?.tugas_aktif ?? 0,
    logistikPending: row?.logistik_pending ?? 0,
  };
}

/** Detect staf bidang from jabatan field */
function detectBidang(jabatan?: string): 'pers' | 'log' | 'ops' | 'umum' {
  if (!jabatan) return 'umum';
  const j = jabatan.toLowerCase();
  if (j.includes('s-1') || j.includes('s1') || j.includes('pers')) return 'pers';
  if (j.includes('s-4') || j.includes('s4') || j.includes('log')) return 'log';
  if (j.includes('s-3') || j.includes('s3') || j.includes('ops')) return 'ops';
  return 'umum';
}

const BIDANG_LABEL: Record<string, string> = {
  pers: 'Staf Personel (S-1)',
  log: 'Staf Logistik (S-4)',
  ops: 'Staf Operasional (S-3)',
  umum: 'Staf Operasional',
};

/** Quick-access module cards per bidang */
const BIDANG_MODULES: Record<string, { path: string; label: string; icon: string; color: string }[]> = {
  pers: [
    { path: '/admin/users',       label: 'Manajemen Personel', icon: '👥', color: 'border-blue-500/30 bg-blue-500/5' },
    { path: '/admin/attendance',  label: 'Rekap Absensi',      icon: '📋', color: 'border-emerald-500/30 bg-emerald-500/5' },
    { path: '/admin/schedule',    label: 'Jadwal Shift',       icon: '📅', color: 'border-amber-500/30 bg-amber-500/5' },
    { path: '/staf/messages',     label: 'Pesan',              icon: '💬', color: 'border-purple-500/30 bg-purple-500/5' },
  ],
  log: [
    { path: '/admin/logistics',   label: 'Inventaris Logistik', icon: '📦', color: 'border-orange-500/30 bg-orange-500/5' },
    { path: '/admin/users',       label: 'Data Personel',       icon: '👥', color: 'border-blue-500/30 bg-blue-500/5' },
    { path: '/staf/messages',     label: 'Pesan',               icon: '💬', color: 'border-purple-500/30 bg-purple-500/5' },
    { path: '/admin/attendance',  label: 'Rekap Absensi',       icon: '📋', color: 'border-emerald-500/30 bg-emerald-500/5' },
  ],
  ops: [
    { path: '/komandan/tasks',    label: 'Manajemen Tugas',     icon: '✅', color: 'border-green-500/30 bg-green-500/5' },
    { path: '/staf/sprint',       label: 'Surat Perintah',      icon: '📜', color: 'border-cyan-500/30 bg-cyan-500/5' },
    { path: '/admin/pos-jaga',    label: 'Pos Jaga',            icon: '🛡️', color: 'border-red-500/30 bg-red-500/5' },
    { path: '/admin/users',       label: 'Data Personel',       icon: '👥', color: 'border-blue-500/30 bg-blue-500/5' },
  ],
  umum: [
    { path: '/admin/users',       label: 'Data Personel',       icon: '👥', color: 'border-blue-500/30 bg-blue-500/5' },
    { path: '/admin/attendance',  label: 'Rekap Absensi',       icon: '📋', color: 'border-emerald-500/30 bg-emerald-500/5' },
    { path: '/admin/logistics',   label: 'Logistik',            icon: '📦', color: 'border-orange-500/30 bg-orange-500/5' },
    { path: '/staf/messages',     label: 'Pesan',               icon: '💬', color: 'border-purple-500/30 bg-purple-500/5' },
  ],
};

export default function StafDashboard() {
  const { user } = useAuthStore();
  const { flags } = useFeatureStore();
  const { announcements, isLoading: announcementsLoading } = useAnnouncements();

  const [stats, setStats] = useState<StafStats>(EMPTY_STATS);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const bidang = useMemo(() => detectBidang(user?.jabatan), [user?.jabatan]);

  const loadStats = useCallback(async () => {
    if (!user?.satuan) return;
    setStatsError(null);
    try {
      const data = await fetchStafStats(user.satuan);
      setStats(data);
    } catch {
      setStatsError('Gagal memuat statistik. Coba muat ulang.');
    } finally {
      setStatsLoading(false);
    }
  }, [user?.satuan]);
  const { requestRefresh: requestStatsRefresh } = useVisibilityAwareRefresh(loadStats);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await loadStats();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    return subscribeDataChanges(['users', 'attendance', 'tasks', 'logistics_items'], () => {
      requestStatsRefresh();
    }, { debounceMs: 500 });
  }, [requestStatsRefresh]);

  const modules = useMemo(() => BIDANG_MODULES[bidang].filter((m) => isPathEnabled(m.path, flags)), [bidang, flags]);
  const pinnedAnnouncements = useMemo(() => announcements.filter((a) => a.is_pinned).slice(0, 3), [announcements]);

  const hadirPct = useMemo(() => (
    stats.totalPersonel > 0
      ? Math.round((stats.hadirHariIni / stats.totalPersonel) * 100)
      : 0
  ), [stats.hadirHariIni, stats.totalPersonel]);

  return (
    <DashboardLayout title="Pusat Staf">
      <div className="space-y-6">
        <PageHeader
          title={`${user?.pangkat ? `${user.pangkat} ` : ''}${user?.nama ?? 'Staf'}`}
          subtitle={`${BIDANG_LABEL[bidang]} · Satuan: ${user?.satuan ?? '—'} · ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
          meta={
            <>
              <span>Personel Hadir: {stats.hadirHariIni}/{stats.totalPersonel} ({hadirPct}%)</span>
              <span>{stats.tugasAktif} tugas aktif</span>
            </>
          }
          actions={
            <Button variant="outline" onClick={() => void refresh()} isLoading={isRefreshing}>
              Muat Ulang
            </Button>
          }
        />

        {/* Stats */}
        {statsLoading ? (
          <StatCardsSkeleton />
        ) : statsError ? (
          <div className="rounded-xl border border-accent-red/40 bg-accent-red/10 p-4 text-sm text-accent-red">
            {statsError}
          </div>
        ) : (
          <StatsGrid>
            <StatCard
              icon={<ICONS.UsersRound className="h-5 w-5 text-primary" aria-hidden="true" />}
              label="Total Personel"
              value={stats.totalPersonel}
              accent="blue"
            />
            <StatCard
              icon={<ICONS.UserCheck className="h-5 w-5 text-success" aria-hidden="true" />}
              label="Hadir Hari Ini"
              value={stats.hadirHariIni}
              trend={`${hadirPct}% dari total`}
              trendUp={hadirPct >= 80}
              accent="green"
            />
            <StatCard
              icon={<ICONS.Clipboard className="h-5 w-5 text-accent-gold" aria-hidden="true" />}
              label="Tugas Aktif"
              value={stats.tugasAktif}
              accent="gold"
            />
            <StatCard
              icon={<ICONS.Package className="h-5 w-5 text-accent-red" aria-hidden="true" />}
              label="Logistik Pending"
              value={stats.logistikPending}
              accent={stats.logistikPending > 0 ? 'red' : 'green'}
            />
          </StatsGrid>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Quick Access Modules */}
          <div className="app-card p-4 lg:col-span-1">
            <div className="panel-heading mb-3">
              <h3 className="panel-heading__title">Modul Akses Cepat</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {modules.map((mod) => (
                <Link
                  key={mod.path}
                  to={mod.path}
                  className={`dashboard-module-tile ${mod.color}`}
                >
                  <span className="text-2xl">{mod.icon}</span>
                  <span className="text-xs leading-snug">{mod.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Announcements */}
          <div className="app-card p-4 lg:col-span-2">
            <div className="panel-heading mb-3">
              <h3 className="panel-heading__title">Pengumuman Terpinit</h3>
            </div>
            <div className="space-y-3">
              {announcementsLoading ? (
                <CardListSkeleton count={2} />
              ) : pinnedAnnouncements.length === 0 ? (
                <EmptyState
                  icon="📢"
                  title="Belum ada pengumuman"
                  description="Pengumuman penting akan muncul di sini"
                />
              ) : (
                pinnedAnnouncements.map((ann) => (
                  <div
                    key={ann.id}
                    className="rounded-2xl border border-surface/70 bg-surface/10 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-accent-gold text-base" aria-hidden="true">📌</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-primary">{ann.judul}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-text-muted">{ann.isi}</p>
                        <p className="mt-2 text-[10px] text-text-muted/60">
                          {new Date(ann.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
