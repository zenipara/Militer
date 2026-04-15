import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard, { StatsGrid } from '../../components/ui/StatCard';
import TaskCard from '../../components/ui/TaskCard';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/common/Button';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { useTasks } from '../../hooks/useTasks';
import { useAnnouncements } from '../../hooks/useAnnouncements';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

export default function KomandanDashboard() {
  const { user } = useAuthStore();
  const { tasks, isLoading: tasksLoading, refetch: refetchTasks } = useTasks({ assignedBy: user?.id });
  const { announcements } = useAnnouncements();
  const [onlineCount, setOnlineCount] = useState(0);
  const [totalPersonel, setTotalPersonel] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!user?.satuan) return;
    const [onlineRes, totalRes] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_online', true).eq('satuan', user.satuan),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('satuan', user.satuan).eq('is_active', true),
    ]);
    setOnlineCount(onlineRes.count ?? 0);
    setTotalPersonel(totalRes.count ?? 0);
  }, [user?.satuan]);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchStats(), refetchTasks()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  // Gunakan ref agar tidak terjadi duplicate subscription
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel('komandan-dashboard');
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => { void fetchStats(); });
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => { void refetchTasks(); });
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => { void fetchStats(); });
    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchStats, refetchTasks]);

  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  const doneTasks = tasks.filter((t) => t.status === 'done');
  const approvedTasks = tasks.filter((t) => t.status === 'approved');
  const pinnedAnnouncements = announcements.filter((a) => a.is_pinned);

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
              <Link to="/komandan/tasks" className="inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25">
                Kelola Tugas
              </Link>
            </>
          }
        />

        <StatsGrid>
          <StatCard icon="👥" label="Total Personel" value={totalPersonel} />
          <StatCard icon="🟢" label="Sedang Online" value={onlineCount} trend="aktif sekarang" trendUp />
          <StatCard icon="⏳" label="Tugas Aktif" value={pendingTasks.length} />
          <StatCard icon="✓" label="Tugas Disetujui" value={approvedTasks.length} trend={doneTasks.length > 0 ? `${doneTasks.length} menunggu review` : 'belum ada'} />
        </StatsGrid>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="app-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Ringkasan Operasi</h3>
                <p className="text-sm text-text-muted">Situasi cepat untuk pengambilan keputusan harian.</p>
              </div>
              <Link to="/komandan/reports" className="text-sm text-primary hover:underline">Lihat laporan →</Link>
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
              <Link to="/komandan/tasks" className="rounded-xl border border-surface/70 bg-bg-card px-4 py-2 text-sm font-medium text-text-primary hover:border-primary">Buka tugas</Link>
              <Link to="/komandan/attendance" className="rounded-xl border border-surface/70 bg-bg-card px-4 py-2 text-sm font-medium text-text-primary hover:border-primary">Absensi</Link>
              <Link to="/komandan/personnel" className="rounded-xl border border-surface/70 bg-bg-card px-4 py-2 text-sm font-medium text-text-primary hover:border-primary">Personel</Link>
            </div>
          </div>

          <div className="app-card p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Pengumuman Terbaru</h3>
                <p className="text-sm text-text-muted">Pin resmi yang relevan untuk satuan.</p>
              </div>
              <Link to="/komandan/reports" className="text-sm text-primary hover:underline">Ke laporan →</Link>
            </div>
            {pinnedAnnouncements.length === 0 ? (
              <p className="text-sm text-text-muted">Belum ada pengumuman yang disematkan.</p>
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
            <Link to="/komandan/tasks" className="text-sm text-primary hover:underline">Lihat semua →</Link>
          </div>

          {tasksLoading ? (
            <CardListSkeleton count={4} />
          ) : tasks.length === 0 ? (
            <div className="bg-bg-card border border-surface rounded-xl p-8 text-center text-text-muted">
              Belum ada tugas yang dibuat
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {tasks.slice(0, 6).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  showAssignee
                  onAction={() => { window.location.href = '/komandan/tasks'; }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
