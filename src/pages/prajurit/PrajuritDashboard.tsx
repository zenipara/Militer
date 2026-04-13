import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard, { StatsGrid } from '../../components/ui/StatCard';
import TaskCard from '../../components/ui/TaskCard';
import { useTasks } from '../../hooks/useTasks';
import { useAttendance } from '../../hooks/useAttendance';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import Button from '../../components/common/Button';
import { AttendanceBadge } from '../../components/common/Badge';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { useState } from 'react';

export default function PrajuritDashboard() {
  const { user } = useAuthStore();
  const { showNotification } = useUIStore();
  const { tasks, isLoading: tasksLoading } = useTasks({ assignedTo: user?.id });
  const { todayAttendance, isLoading: attnLoading, checkIn, checkOut } = useAttendance();
  const { announcements, isLoading: annLoading } = useAnnouncements();
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const activeTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  const doneTasks = tasks.filter((t) => t.status === 'done' || t.status === 'approved');
  const rejectedTasks = tasks.filter((t) => t.status === 'rejected');

  // Recent announcements: pinned first, limit 3
  const recentAnnouncements = [...announcements]
    .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
    .slice(0, 3);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      await checkIn();
      showNotification('Check-in berhasil!', 'success');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal check-in', 'error');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      await checkOut();
      showNotification('Check-out berhasil!', 'success');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal check-out', 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">
              {user?.pangkat ? `${user.pangkat} ` : ''}
              <span className="text-primary">{user?.nama}</span>
            </h2>
            <p className="text-text-muted mt-1">
              {user?.satuan} — {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Quick attendance */}
          <div className="flex items-center gap-3">
            {attnLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-surface border-t-primary" />
            ) : todayAttendance ? (
              <div className="flex items-center gap-3">
                <AttendanceBadge status={todayAttendance.status} />
                {todayAttendance.check_in && !todayAttendance.check_out && (
                  <Button size="sm" variant="secondary" onClick={handleCheckOut} isLoading={checkingOut}>
                    Check-Out
                  </Button>
                )}
              </div>
            ) : (
              <Button size="sm" onClick={handleCheckIn} isLoading={checkingIn}>
                Check-In
              </Button>
            )}
          </div>
        </div>

        {/* Alert: rejected tasks */}
        {rejectedTasks.length > 0 && (
          <div className="flex items-start gap-3 bg-accent-red/10 border border-accent-red/30 rounded-xl p-4">
            <span className="text-accent-red text-xl">⚠</span>
            <div>
              <p className="font-semibold text-accent-red text-sm">
                {rejectedTasks.length} tugas dikembalikan untuk direvisi
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Komandan telah memberikan catatan. Buka halaman Tugas Saya untuk melihat detail.
              </p>
              <a href="/prajurit/tasks" className="text-xs text-accent-red underline mt-1 inline-block">
                Lihat tugas yang ditolak →
              </a>
            </div>
          </div>
        )}

        {/* Stats */}
        <StatsGrid>
          <StatCard icon="⏳" label="Tugas Aktif" value={activeTasks.length} />
          <StatCard icon="✓" label="Tugas Selesai" value={doneTasks.length} />
          <StatCard icon="📋" label="Total Tugas" value={tasks.length} />
          <StatCard
            icon="📅"
            label="Status Hari Ini"
            value={todayAttendance ? '✓' : '—'}
          />
        </StatsGrid>

        {/* Announcements */}
        {(annLoading || recentAnnouncements.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-text-primary">📢 Pengumuman</h3>
            </div>
            {annLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse bg-surface/70 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {recentAnnouncements.map((ann) => (
                  <div
                    key={ann.id}
                    className={`bg-bg-card border rounded-xl px-4 py-3 ${ann.is_pinned ? 'border-accent-gold/40' : 'border-surface'}`}
                  >
                    <div className="flex items-start gap-2">
                      {ann.is_pinned && <span className="text-accent-gold text-xs mt-0.5">📌</span>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">{ann.judul}</p>
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{ann.isi}</p>
                      </div>
                      <span className="text-xs text-text-muted flex-shrink-0">
                        {new Date(ann.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My active tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-text-primary">Tugas Aktif Saya</h3>
            <a href="/prajurit/tasks" className="text-sm text-primary hover:underline">Lihat semua →</a>
          </div>

          {tasksLoading ? (
            <CardListSkeleton count={2} />
          ) : activeTasks.length === 0 ? (
            <div className="bg-bg-card border border-surface rounded-xl p-8 text-center text-text-muted">
              🎉 Tidak ada tugas aktif saat ini
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {activeTasks.slice(0, 4).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onAction={() => { window.location.href = '/prajurit/tasks'; }}
                  actionLabel="Kerjakan"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
