import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard, { StatsGrid } from '../../components/ui/StatCard';
import TaskCard from '../../components/ui/TaskCard';
import { useTasks } from '../../hooks/useTasks';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { CardListSkeleton } from '../../components/common/Skeleton';

export default function KomandanDashboard() {
  const { user } = useAuthStore();
  const { tasks, isLoading: tasksLoading } = useTasks({ assignedBy: user?.id });
  const [onlineCount, setOnlineCount] = useState(0);
  const [totalPersonel, setTotalPersonel] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const [onlineRes, totalRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_online', true).eq('satuan', user?.satuan ?? ''),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('satuan', user?.satuan ?? '').eq('is_active', true),
      ]);
      setOnlineCount(onlineRes.count ?? 0);
      setTotalPersonel(totalRes.count ?? 0);
    };
    if (user?.satuan) void fetchStats();
  }, [user]);

  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  return (
    <DashboardLayout title="Ops Center">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">
            {user?.pangkat ? `${user.pangkat} ` : ''}
            <span className="text-primary">{user?.nama}</span>
          </h2>
          <p className="text-text-muted mt-1">
            Satuan: {user?.satuan} — {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <StatsGrid>
          <StatCard icon="👥" label="Total Personel" value={totalPersonel} />
          <StatCard icon="🟢" label="Sedang Online" value={onlineCount} trend="aktif sekarang" trendUp />
          <StatCard icon="⏳" label="Tugas Aktif" value={pendingTasks.length} />
          <StatCard icon="✓" label="Menunggu Persetujuan" value={doneTasks.length} trend={doneTasks.length > 0 ? 'perlu ditinjau' : undefined} />
        </StatsGrid>

        {/* Recent tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-text-primary">Tugas Terkini</h3>
            <a href="/komandan/tasks" className="text-sm text-primary hover:underline">Lihat semua →</a>
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
