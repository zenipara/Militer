import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard, { StatsGrid } from '../../components/ui/StatCard';
import TaskCard from '../../components/ui/TaskCard';
import { useTasks } from '../../hooks/useTasks';
import { useAttendance } from '../../hooks/useAttendance';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import { useMessages } from '../../hooks/useMessages';
import { useAuthStore } from '../../store/authStore';
import { useFeatureStore } from '../../store/featureStore';
import { useUIStore } from '../../store/uiStore';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { AttendanceBadge } from '../../components/common/Badge';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import { ICONS } from '../../icons';
import { isPathEnabled } from '../../lib/featureFlags';

export default function PrajuritDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { flags } = useFeatureStore();
  const { showNotification } = useUIStore();
  const { tasks, isLoading: tasksLoading } = useTasks({ assignedTo: user?.id });
  const { todayAttendance, isLoading: attnLoading, checkIn, checkOut } = useAttendance();
  const { announcements, isLoading: annLoading } = useAnnouncements();
  const { unreadCount } = useMessages();
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const activeTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  const doneTasks = tasks.filter((t) => t.status === 'done' || t.status === 'approved');
  const rejectedTasks = tasks.filter((t) => t.status === 'rejected');

  // Recent announcements: pinned first, limit 3
  const recentAnnouncements = [...announcements]
    .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
    .slice(0, 3);

  const canOpenTasks = isPathEnabled('/prajurit/tasks', flags);
  const canOpenMessages = isPathEnabled('/prajurit/messages', flags);
  const canOpenAttendance = isPathEnabled('/prajurit/attendance', flags);
  const canOpenGatePass = isPathEnabled('/prajurit/gatepass', flags);
  const canOpenScanPos = isPathEnabled('/prajurit/scan-pos', flags);
  const canOpenLeave = isPathEnabled('/prajurit/leave', flags);
  const canViewTaskModules = canOpenTasks;
  const canViewAttendanceModules = canOpenAttendance;

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      await checkIn();
      showNotification('Absen masuk berhasil!', 'success');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal absen masuk', 'error');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      await checkOut();
      showNotification('Absen pulang berhasil!', 'success');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal absen pulang', 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        <PageHeader
          title={`${user?.pangkat ? `${user.pangkat} ` : ''}${user?.nama ?? 'Prajurit'}`}
          subtitle={`${user?.satuan ?? '—'} · ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
          meta={
            <>
              {canViewAttendanceModules && (
                <span>{todayAttendance ? 'Absensi hari ini tercatat' : 'Belum absen masuk'}</span>
              )}
              {canOpenMessages && <span>{unreadCount} pesan belum dibaca</span>}
            </>
          }
          actions={
            <>
              {canViewAttendanceModules && (
                attnLoading ? (
                  <LoadingSpinner size="sm" />
                ) : todayAttendance ? (
                  <div className="flex items-center gap-3">
                    <AttendanceBadge status={todayAttendance.status} />
                    {todayAttendance.check_in && !todayAttendance.check_out && (
                      <Button size="sm" variant="secondary" onClick={handleCheckOut} isLoading={checkingOut}>
                        Absen Pulang
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button size="sm" onClick={handleCheckIn} isLoading={checkingIn}>
                    Absen Masuk
                  </Button>
                )
              )}
            </>
          }
        />

        <div className="grid gap-3 sm:grid-cols-3">
          {canOpenTasks && (
            <Link to="/prajurit/tasks" className="app-card p-4 transition-colors hover:border-primary/60">
              <p className="text-xs text-text-muted">Tugas aktif</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{activeTasks.length}</p>
            </Link>
          )}
          {canOpenMessages && (
            <Link to="/prajurit/messages" className="app-card p-4 transition-colors hover:border-primary/60">
              <p className="text-xs text-text-muted">Pesan belum dibaca</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{unreadCount}</p>
            </Link>
          )}
          {canOpenAttendance && (
            <Link to="/prajurit/attendance" className="app-card p-4 transition-colors hover:border-primary/60">
              <p className="text-xs text-text-muted">Status absensi</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{todayAttendance ? 'Aktif' : 'Belum'}</p>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
          {canOpenGatePass && (
            <Link to="/prajurit/gatepass" className="flex min-h-[44px] items-center gap-2 rounded-xl border border-surface/70 bg-bg-card px-4 py-2.5 text-sm font-medium text-text-primary hover:border-primary active:scale-[0.97] transition-all">
              {ICONS.ClipboardCheck ? <ICONS.ClipboardCheck className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" /> : null}
              Gate Pass
            </Link>
          )}
          {canOpenScanPos && (
            <Link to="/prajurit/scan-pos" className="flex min-h-[44px] items-center gap-2 rounded-xl border border-surface/70 bg-bg-card px-4 py-2.5 text-sm font-medium text-text-primary hover:border-primary active:scale-[0.97] transition-all">
              {ICONS.ScanLine ? <ICONS.ScanLine className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" /> : null}
              Scan Pos
            </Link>
          )}
          {canOpenTasks && (
            <Link to="/prajurit/tasks" className="flex min-h-[44px] items-center gap-2 rounded-xl border border-surface/70 bg-bg-card px-4 py-2.5 text-sm font-medium text-text-primary hover:border-primary active:scale-[0.97] transition-all">
              {ICONS.CheckSquare ? <ICONS.CheckSquare className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" /> : null}
              Tugas Saya
            </Link>
          )}
          {canOpenMessages && (
            <Link to="/prajurit/messages" className="flex min-h-[44px] items-center gap-2 rounded-xl border border-surface/70 bg-bg-card px-4 py-2.5 text-sm font-medium text-text-primary hover:border-primary active:scale-[0.97] transition-all">
              {ICONS.Megaphone ? <ICONS.Megaphone className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" /> : null}
              Pesan
            </Link>
          )}
          {canOpenLeave && (
            <Link to="/prajurit/leave" className="flex min-h-[44px] items-center gap-2 rounded-xl border border-surface/70 bg-bg-card px-4 py-2.5 text-sm font-medium text-text-primary hover:border-primary active:scale-[0.97] transition-all">
              {ICONS.UserCheck ? <ICONS.UserCheck className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" /> : null}
              Ajukan Izin
            </Link>
          )}
        </div>

        {/* Alert: rejected tasks */}
        {canViewTaskModules && rejectedTasks.length > 0 && (
          <div className="flex items-start gap-3 bg-accent-red/10 border border-accent-red/30 rounded-xl p-4">
            <ICONS.AlertTriangle className="mt-0.5 h-5 w-5 text-accent-red" aria-hidden="true" />
            <div>
              <p className="font-semibold text-accent-red text-sm">
                {rejectedTasks.length} tugas dikembalikan untuk direvisi
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Komandan telah memberikan catatan. Buka halaman Tugas Saya untuk melihat detail.
              </p>
              {canOpenTasks && (
                <Link to="/prajurit/tasks" className="text-xs text-accent-red underline mt-1 inline-block">
                  Lihat tugas yang ditolak →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        {(canViewTaskModules || canViewAttendanceModules) && (
          <StatsGrid>
            {canViewTaskModules && (
              <>
                <StatCard icon={<ICONS.Clipboard className="h-5 w-5 text-accent-gold" aria-hidden="true" />} label="Tugas Aktif" value={activeTasks.length} />
                <StatCard icon={<ICONS.BadgeCheck className="h-5 w-5 text-success" aria-hidden="true" />} label="Tugas Selesai" value={doneTasks.length} />
                <StatCard icon={<ICONS.ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />} label="Total Tugas" value={tasks.length} />
              </>
            )}
            {canViewAttendanceModules && (
              <StatCard
                icon={<ICONS.CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />}
                label="Status Hari Ini"
                value={todayAttendance ? 'Hadir' : '—'}
              />
            )}
          </StatsGrid>
        )}

        {/* Announcements */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 font-semibold text-text-primary">
              <ICONS.Megaphone className="h-4 w-4 text-primary" aria-hidden="true" />
              Pengumuman
            </h3>
          </div>
          {annLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse bg-surface/70 rounded-xl" />
              ))}
            </div>
          ) : recentAnnouncements.length === 0 ? (
            <EmptyState
              title="Belum ada pengumuman"
              description="Info terbaru dari komando akan muncul otomatis di sini."
              className="py-8"
            />
          ) : (
            <div className="space-y-2">
              {recentAnnouncements.map((ann) => (
                <div
                  key={ann.id}
                  className={`bg-bg-card border rounded-xl px-4 py-3 ${ann.is_pinned ? 'border-accent-gold/40' : 'border-surface'}`}
                >
                  <div className="flex items-start gap-2">
                    {ann.is_pinned && <ICONS.Pin className="mt-0.5 h-3.5 w-3.5 text-accent-gold" aria-hidden="true" />}
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

        {/* My active tasks */}
        {canViewTaskModules && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-text-primary">Tugas Aktif Saya</h3>
              <Link to="/prajurit/tasks" className="text-sm text-primary hover:underline">Lihat semua →</Link>
            </div>

            {tasksLoading ? (
              <CardListSkeleton count={2} />
            ) : activeTasks.length === 0 ? (
              <EmptyState
                title="Tidak ada tugas aktif"
                description="Tugas baru akan muncul di sini begitu komandan menugaskan Anda."
                action={(
                  <Link
                    to="/prajurit/tasks"
                    className="inline-flex min-h-[40px] items-center rounded-xl border border-surface bg-slate-50 px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-primary hover:text-primary dark:bg-surface/45"
                  >
                    Buka daftar tugas
                  </Link>
                )}
                className="py-10"
              />
            ) : (
              <div className="grid grid-cols-1 gap-3">
              {activeTasks.slice(0, 4).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onAction={() => {
                    if (canOpenTasks) navigate('/prajurit/tasks');
                  }}
                  actionLabel="Kerjakan"
                />
              ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
