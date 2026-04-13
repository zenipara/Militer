import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard, { StatsGrid } from '../../components/ui/StatCard';
import { StatCardsSkeleton } from '../../components/common/Skeleton';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import type { AuditLog } from '../../types';

interface DashboardStats {
  totalPersonel: number;
  totalOnline: number;
  totalTugas: number;
  tugasAktif: number;
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersResult, tasksResult, onlineResult, activeTasks, logsResult] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('tasks').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_online', true),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']),
        supabase
          .from('audit_logs')
          .select('*, user:user_id(id,nama,nrp,role)')
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      setStats({
        totalPersonel: usersResult.count ?? 0,
        totalOnline: onlineResult.count ?? 0,
        totalTugas: tasksResult.count ?? 0,
        tugasAktif: activeTasks.count ?? 0,
      });
      setRecentLogs((logsResult.data as AuditLog[]) ?? []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();

    // Realtime: refresh when users or tasks change
    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, () => { void fetchData(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => { void fetchData(); })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const actionLabels: Record<string, string> = {
    LOGIN: '🔑 Login',
    LOGOUT: '🚪 Logout',
    CREATE: '➕ Buat',
    UPDATE: '✏ Ubah',
    DELETE: '🗑 Hapus',
  };

  return (
    <DashboardLayout title="Control Center">
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold text-text-primary">
            Selamat datang, <span className="text-primary">{user?.nama}</span>
          </h2>
          <p className="text-text-muted mt-1">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

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

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {quickLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="bg-bg-card border border-surface hover:border-primary rounded-xl p-4 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xl">{item.icon}</span>
                <h3 className="font-semibold text-text-primary text-sm group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
              </div>
              <p className="text-xs text-text-muted">{item.desc}</p>
            </a>
          ))}
        </div>

        {/* Recent activity feed */}
        <div className="bg-bg-card border border-surface rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Aktivitas Terbaru</h3>
            <a href="/admin/audit" className="text-xs text-primary hover:underline">Lihat semua →</a>
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
    </DashboardLayout>
  );
}
