import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard, { StatsGrid } from '../../components/ui/StatCard';
import TaskCard from '../../components/ui/TaskCard';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { useTasks } from '../../hooks/useTasks';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import { useAuthStore } from '../../store/authStore';
import { useFeatureStore } from '../../store/featureStore';
import { ICONS } from '../../icons';
import { useKomandanDashboardStore } from '../../store/komandanDashboardStore';
import { subscribeDataChanges } from '../../lib/dataSync';
import { isPathEnabled } from '../../lib/featureFlags';

export default function KomandanDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { flags } = useFeatureStore();
  const { tasks, isLoading: tasksLoading, refetch: refetchTasks } = useTasks({ assignedBy: user?.id });
  const { announcements } = useAnnouncements();
  const { onlineCount, totalPersonel, error, fetchStats } = useKomandanDashboardStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchStats(user?.satuan), refetchTasks()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchStats(user?.satuan);
  }, [fetchStats, user?.satuan]);

  useEffect(() => {
    return subscribeDataChanges(['users', 'tasks', 'announcements'], (changed) => {
      if (changed.includes('users') || changed.includes('announcements')) {
        void fetchStats(user?.satuan);
      }
      if (changed.includes('tasks')) {
        void refetchTasks();
      }
    });
  }, [fetchStats, refetchTasks, user?.satuan]);

  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  const doneTasks = tasks.filter((t) => t.status === 'done');
  const approvedTasks = tasks.filter((t) => t.status === 'approved');
  const pinnedAnnouncements = announcements.filter((a) => a.is_pinned);

  const canOpenTasks = isPathEnabled('/komandan/tasks', flags);
  const canOpenReports = isPathEnabled('/komandan/reports', flags);
  const canOpenAttendance = isPathEnabled('/komandan/attendance', flags);
  const canOpenPersonnel = isPathEnabled('/komandan/personnel', flags);

  return (
    <DashboardLayout title="Pusat Operasi">
      <div className="space-y-6">
        <PageHeader
          title={`${user?.pangkat ? `${user.pangkat} ` : ''}${user?.nama ?? 'Komandan'}`}
          subtitle={`Satuan: ${user?.satuan ?? '—'} · ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
          meta={
            <>
              <span>Aktif: {onlineCount}/{totalPersonel}</span>
              <span>{pendingTasks.length} tugas aktif</span>
            </>
          }
          actions={
            <>
              <Button variant="outline" onClick={() => void refresh()} isLoading={isRefreshing}>Muat Ulang</Button>
              {canOpenTasks && (
                <Link to="/komandan/tasks" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25">
                  Kelola Tugas
                </Link>
              )}
            </>
          }
        />

        {error && (
          <div className="rounded-xl border border-accent-red/40 bg-accent-red/10 p-4 text-sm text-accent-red">
            {error}
          </div>
        )}

        <StatsGrid>
          <StatCard icon={<ICONS.UsersRound className="h-5 w-5 text-primary" aria-hidden="true" />} label="Total Personel" value={totalPersonel} />
          <StatCard icon={<ICONS.UserCheck className="h-5 w-5 text-success" aria-hidden="true" />} label="Sedang Online" value={onlineCount} trend="aktif sekarang" trendUp />
          <StatCard icon={<ICONS.Clipboard className="h-5 w-5 text-accent-gold" aria-hidden="true" />} label="Tugas Aktif" value={pendingTasks.length} />
          <StatCard icon={<ICONS.BadgeCheck className="h-5 w-5 text-success" aria-hidden="true" />} label="Tugas Disetujui" value={approvedTasks.length} trend={doneTasks.length > 0 ? `${doneTasks.length} menunggu review` : 'belum ada'} />
        </StatsGrid>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="app-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Ringkasan Operasi</h3>
                <p className="text-sm text-text-muted">Situasi cepat untuk pengambilan keputusan harian.</p>
              </div>
              {canOpenReports && <Link to="/komandan/reports" className="text-sm text-primary hover:underline">Lihat laporan →</Link>}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Pending', value: pendingTasks.length },
                { label: 'Selesai', value: doneTasks.length },
                { label: 'Pin pengumuman', value: pinnedAnnouncements.length },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-surface/70 bg-surface/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{item.label}</p>
                  <p className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {canOpenTasks && <Link to="/komandan/tasks" className="rounded-xl border border-surface/70 bg-bg-card px-4 py-2 text-sm font-medium text-text-primary hover:border-primary">Buka tugas</Link>}
              {canOpenAttendance && <Link to="/komandan/attendance" className="rounded-xl border border-surface/70 bg-bg-card px-4 py-2 text-sm font-medium text-text-primary hover:border-primary">Absensi</Link>}
              {canOpenPersonnel && <Link to="/komandan/personnel" className="rounded-xl border border-surface/70 bg-bg-card px-4 py-2 text-sm font-medium text-text-primary hover:border-primary">Personel</Link>}
            </div>
          </div>

          <div className="app-card p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Pengumuman Terbaru</h3>
                <p className="text-sm text-text-muted">Pin resmi yang relevan untuk satuan.</p>
              </div>
              {canOpenReports && <Link to="/komandan/reports" className="text-sm text-primary hover:underline">Ke laporan →</Link>}
            </div>
            {pinnedAnnouncements.length === 0 ? (
              <EmptyState
                title="Belum ada pengumuman penting"
                description="Pengumuman yang disematkan akan muncul di sini agar komandan cepat melihat informasi prioritas."
                className="border-0 bg-transparent px-0 py-8"
              />
            ) : (
              <div className="space-y-2">
                {pinnedAnnouncements.slice(0, 3).map((announcement) => (
                  <div key={announcement.id} className="rounded-xl border border-accent-gold/30 bg-accent-gold/10 p-4">
                    <p className="text-sm font-semibold text-text-primary">{announcement.judul}</p>
                    <p className="mt-1 text-xs text-text-muted line-clamp-2">{announcement.isi}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-text-primary">Tugas Terkini</h3>
            {canOpenTasks && <Link to="/komandan/tasks" className="text-sm text-primary hover:underline">Lihat semua →</Link>}
          </div>

          {tasksLoading ? (
            <CardListSkeleton count={4} />
          ) : tasks.length === 0 ? (
            <EmptyState
              title="Belum ada tugas dibuat"
              description="Mulai distribusikan pekerjaan ke personel agar progres harian bisa dipantau dari dashboard ini."
              action={canOpenTasks ? (
                <Link
                  to="/komandan/tasks"
                  className="inline-flex min-h-[40px] items-center rounded-xl border border-surface bg-slate-50 px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-primary hover:text-primary dark:bg-surface/45"
                >
                  Buat atau kelola tugas
                </Link>
              ) : undefined}
              className="py-10"
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {tasks.slice(0, 6).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  showAssignee
                  onAction={() => {
                    if (canOpenTasks) navigate('/komandan/tasks');
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
