import type { RealtimeChannel } from '@supabase/supabase-js';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import BarChart from '../../components/ui/BarChart';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useLeaveRequests } from '../../hooks/useLeaveRequests';
import { AttendanceBadge, TaskStatusBadge, LeaveStatusBadge } from '../../components/common/Badge';
import { CardListSkeleton, StatCardsSkeleton } from '../../components/common/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import type { Attendance, Task } from '../../types';

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { user } = useAuthStore();
  const { showNotification } = useUIStore();
  const { requests: leaveRequests, reviewLeaveRequest } = useLeaveRequests({ satuan: user?.satuan });
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [attnRes, taskRes] = await Promise.all([
      supabase
        .from('attendance')
        .select('*, user:user_id(id,nama,nrp,pangkat)')
        .eq('tanggal', selectedDate)
        .order('created_at', { ascending: false }),
      supabase
        .from('tasks')
        .select('*, assignee:assigned_to(id,nama,nrp), assigner:assigned_by(id,nama)')
        .eq('satuan', user?.satuan ?? '')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);
    setAttendances((attnRes.data as Attendance[]) ?? []);
    setTasks((taskRes.data as Task[]) ?? []);
    setIsLoading(false);
  }, [user?.satuan, selectedDate]);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchData();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.satuan) void fetchData();
  }, [user, fetchData]);

  // Gunakan ref agar tidak terjadi duplicate subscription
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user?.satuan) return undefined;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel('komandan-reports');
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => { void fetchData(); });
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => { void fetchData(); });
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => { void fetchData(); });
    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchData, user?.satuan]);

  const leaveByStatus = useMemo(() => ({
    pending: leaveRequests.filter((r) => r.status === 'pending').length,
    approved: leaveRequests.filter((r) => r.status === 'approved').length,
    rejected: leaveRequests.filter((r) => r.status === 'rejected').length,
  }), [leaveRequests]);

  // Per-person task completion chart: top 8 assignees by task count
  const taskByPerson = useMemo(() => {
    const map = new Map<string, { nama: string; done: number; total: number }>();
    tasks.forEach((t) => {
      const key = t.assignee?.id ?? '';
      const nama = t.assignee?.nama ?? '—';
      const prev = map.get(key) ?? { nama, done: 0, total: 0 };
      map.set(key, {
        nama,
        done: prev.done + (t.status === 'approved' || t.status === 'done' ? 1 : 0),
        total: prev.total + 1,
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [tasks]);

  if (isLoading) return (
    <DashboardLayout title="Laporan Harian">
      <div className="space-y-6">
        <StatCardsSkeleton />
        <CardListSkeleton count={3} />
      </div>
    </DashboardLayout>
  );

  const presentCount = attendances.filter((a) => a.status === 'hadir').length;
  const absenCount = attendances.filter((a) => a.status === 'alpa').length;
  const sakitCount = attendances.filter((a) => a.status === 'sakit').length;
  const izinCount = attendances.filter((a) => a.status === 'izin').length;
  const approvedTasks = tasks.filter((t) => t.status === 'approved').length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;
  const rejectedTasks = tasks.filter((t) => t.status === 'rejected').length;
  const pendingLeave = leaveRequests.filter((r) => r.status === 'pending').length;
  const attendanceRate = attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : 0;

  const handleExportCSV = () => {
    const headers = ['Tanggal', 'NRP', 'Nama', 'Pangkat', 'Status', 'Check-In', 'Check-Out', 'Keterangan'];
    const rows = attendances.map((a) => [
      a.tanggal,
      a.user?.nrp ?? '',
      a.user?.nama ?? '',
      a.user?.pangkat ?? '',
      a.status,
      a.check_in ? new Date(a.check_in).toLocaleTimeString('id-ID') : '',
      a.check_out ? new Date(a.check_out).toLocaleTimeString('id-ID') : '',
      a.keterangan ?? '',
    ]);
    downloadCSV([headers, ...rows], `laporan_${user?.satuan ?? 'unit'}_${selectedDate}.csv`);
    showNotification('CSV laporan diekspor', 'success');
  };

  const handleReviewLeave = async (id: string, status: 'approved' | 'rejected') => {
    setReviewingId(id);
    try {
      await reviewLeaveRequest(id, status);
      showNotification(
        status === 'approved' ? 'Izin disetujui' : 'Izin ditolak',
        status === 'approved' ? 'success' : 'info',
      );
    } catch {
      showNotification('Gagal memproses permohonan', 'error');
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <DashboardLayout title="Laporan Harian">
      <div className="space-y-6">
        <PageHeader
          title="Laporan Harian"
          subtitle="Ringkasan cepat status kehadiran, tugas, dan izin personel untuk keputusan harian."
          meta={
            <>
              <span>Unit: {user?.satuan ?? '—'}</span>
              <span>Rasio hadir: {attendanceRate}%</span>
            </>
          }
          actions={
            <>
              <Button variant="outline" onClick={() => void refresh()} isLoading={isRefreshing}>Muat Ulang</Button>
              <Button variant="secondary" onClick={handleExportCSV}>Export CSV</Button>
            </>
          }
        />

        <div className="app-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <label className="text-sm text-text-muted whitespace-nowrap">Tanggal laporan:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-control w-auto"
            />
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-text-muted">
            <span className="rounded-full border border-surface/70 px-2.5 py-1">Izin menunggu: {leaveByStatus.pending}</span>
            <span className="rounded-full border border-surface/70 px-2.5 py-1">Izin disetujui: {leaveByStatus.approved}</span>
            <span className="rounded-full border border-surface/70 px-2.5 py-1">Izin ditolak: {leaveByStatus.rejected}</span>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { icon: '✅', label: 'Hadir', value: presentCount, color: 'text-success' },
            { icon: '❌', label: 'Alpa', value: absenCount, color: 'text-accent-red' },
            { icon: '✓', label: 'Tugas Selesai', value: approvedTasks, color: 'text-primary' },
            { icon: '⏳', label: 'Tugas Aktif', value: pendingTasks, color: 'text-accent-gold' },
            { icon: '📋', label: 'Izin Menunggu', value: pendingLeave, color: 'text-blue-400' },
          ].map((s) => (
            <div key={s.label} className="app-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-sm">{s.label}</span>
                <span className="text-xl">{s.icon}</span>
              </div>
              <div className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Performance Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Attendance breakdown bar chart */}
          <div className="app-card p-5">
            <h3 className="font-semibold text-text-primary mb-1">Distribusi Kehadiran</h3>
            <p className="text-xs text-text-muted mb-4">Komposisi status absensi hari {new Date(selectedDate).toLocaleDateString('id-ID')}</p>
            {attendances.length === 0 ? (
              <p className="text-sm text-text-muted py-8 text-center">Belum ada data absensi</p>
            ) : (
              <BarChart
                data={[
                  { label: 'Hadir',     value: presentCount, color: 'var(--color-success)' },
                  { label: 'Alpa',      value: absenCount,   color: 'var(--color-accent-red)' },
                  { label: 'Sakit',     value: sakitCount,   color: 'var(--color-accent-gold)' },
                  { label: 'Izin',      value: izinCount,    color: '#60a5fa' },
                ]}
                maxValue={attendances.length}
                height={160}
              />
            )}
          </div>

          {/* Task status bar chart */}
          <div className="app-card p-5">
            <h3 className="font-semibold text-text-primary mb-1">Status Tugas Unit</h3>
            <p className="text-xs text-text-muted mb-4">Distribusi status seluruh tugas aktif unit</p>
            {tasks.length === 0 ? (
              <p className="text-sm text-text-muted py-8 text-center">Belum ada data tugas</p>
            ) : (
              <BarChart
                data={[
                  { label: 'Pending',   value: tasks.filter((t) => t.status === 'pending').length,      color: '#94a3b8' },
                  { label: 'Dikerjakan', value: tasks.filter((t) => t.status === 'in_progress').length, color: 'var(--color-accent-gold)' },
                  { label: 'Selesai',   value: doneTasks,    color: '#60a5fa' },
                  { label: 'Disetujui', value: approvedTasks, color: 'var(--color-success)' },
                  { label: 'Ditolak',   value: rejectedTasks, color: 'var(--color-accent-red)' },
                ]}
                maxValue={tasks.length}
                height={160}
              />
            )}
          </div>

          {/* Per-person task chart */}
          {taskByPerson.length > 0 && (
            <div className="app-card p-5 lg:col-span-2">
              <h3 className="font-semibold text-text-primary mb-1">Beban Tugas per Personel</h3>
              <p className="text-xs text-text-muted mb-4">Jumlah total tugas yang ditugaskan (max 8 personel)</p>
              <BarChart
                data={taskByPerson.map((p) => ({
                  label: p.nama.split(' ')[0],
                  value: p.total,
                  color: p.done === p.total && p.total > 0 ? 'var(--color-success)' : 'var(--color-primary)',
                }))}
                maxValue={Math.max(...taskByPerson.map((p) => p.total), 1)}
                height={160}
                unit=" tugas"
              />
            </div>
          )}
        </div>

        {/* Leave Requests Pending Approval */}
        {pendingLeave > 0 && (
          <div className="app-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-surface/80 px-5 py-4">
              <h3 className="font-semibold text-text-primary">Permohonan Izin — Perlu Persetujuan</h3>
              <span className="bg-blue-500/20 text-blue-400 text-xs rounded-full px-2.5 py-0.5 font-medium">
                {pendingLeave} menunggu
              </span>
            </div>
            <div className="divide-y divide-surface/50">
              {leaveRequests
                .filter((r) => r.status === 'pending')
                .map((req) => {
                  const jenisLabel: Record<string, string> = {
                    cuti: '🏖 Cuti',
                    sakit: '🤒 Sakit',
                    dinas_luar: '📋 Dinas Luar',
                  };
                  return (
                    <div key={req.id} className="flex items-center justify-between px-5 py-3 gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">{req.user?.nama ?? '—'}</p>
                        <p className="text-xs text-text-muted">
                          {jenisLabel[req.jenis_izin] ?? req.jenis_izin}
                          {' · '}
                          {new Date(req.tanggal_mulai).toLocaleDateString('id-ID')}
                          {' — '}
                          {new Date(req.tanggal_selesai).toLocaleDateString('id-ID')}
                        </p>
                        <p className="text-xs text-text-muted truncate">{req.alasan}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="primary"
                          isLoading={reviewingId === req.id}
                          onClick={() => handleReviewLeave(req.id, 'approved')}
                        >
                          Setuju
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          isLoading={reviewingId === req.id}
                          onClick={() => handleReviewLeave(req.id, 'rejected')}
                        >
                          Tolak
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Attendance Today */}
        <div className="app-card overflow-hidden">
          <div className="border-b border-surface/80 px-5 py-4">
            <h3 className="font-semibold text-text-primary">
              Absensi Hari Ini — {new Date().toLocaleDateString('id-ID')}
            </h3>
          </div>
          <div className="divide-y divide-surface/50 max-h-64 overflow-y-auto">
            {attendances.length === 0 ? (
              <p className="text-center text-text-muted py-6">Belum ada absensi hari ini</p>
            ) : (
              attendances.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{a.user?.nama ?? '—'}</p>
                    <p className="text-xs text-text-muted font-mono">{a.user?.nrp}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted">
                      {a.check_in ? new Date(a.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                    <AttendanceBadge status={a.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="app-card overflow-hidden">
          <div className="border-b border-surface/80 px-5 py-4">
            <h3 className="font-semibold text-text-primary">Status Tugas Terkini</h3>
          </div>
          <div className="divide-y divide-surface/50 max-h-64 overflow-y-auto">
            {tasks.length === 0 ? (
              <p className="text-center text-text-muted py-6">Belum ada tugas</p>
            ) : (
              tasks.slice(0, 20).map((t) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{t.judul}</p>
                    <p className="text-xs text-text-muted">{t.assignee?.nama ?? '—'}</p>
                  </div>
                  <TaskStatusBadge status={t.status} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* All Leave Requests */}
        <div className="app-card overflow-hidden">
          <div className="border-b border-surface/80 px-5 py-4">
            <h3 className="font-semibold text-text-primary">Riwayat Permohonan Izin</h3>
          </div>
          <div className="divide-y divide-surface/50 max-h-64 overflow-y-auto">
            {leaveRequests.length === 0 ? (
              <p className="text-center text-text-muted py-6">Belum ada permohonan izin</p>
            ) : (
              leaveRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{req.user?.nama ?? '—'}</p>
                    <p className="text-xs text-text-muted">
                      {req.jenis_izin} · {new Date(req.tanggal_mulai).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <LeaveStatusBadge status={req.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

