import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Button from '../../components/common/Button';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useLeaveRequests } from '../../hooks/useLeaveRequests';
import { AttendanceBadge, TaskStatusBadge, LeaveStatusBadge } from '../../components/common/Badge';
import { CardListSkeleton, StatCardsSkeleton } from '../../components/common/Skeleton';
import type { Attendance, Task } from '../../types';

export default function Reports() {
  const { user } = useAuthStore();
  const { showNotification } = useUIStore();
  const { requests: leaveRequests, reviewLeaveRequest } = useLeaveRequests({ satuan: user?.satuan });
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [attnRes, taskRes] = await Promise.all([
      supabase
        .from('attendance')
        .select('*, user:user_id(id,nama,nrp,pangkat)')
        .eq('tanggal', new Date().toISOString().split('T')[0])
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
  }, [user?.satuan]);

  useEffect(() => {
    if (user?.satuan) void fetchData();
  }, [user, fetchData]);

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
  const approvedTasks = tasks.filter((t) => t.status === 'approved').length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;
  const pendingLeave = leaveRequests.filter((r) => r.status === 'pending').length;

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
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { icon: '✅', label: 'Hadir', value: presentCount, color: 'text-success' },
            { icon: '❌', label: 'Alpa', value: absenCount, color: 'text-accent-red' },
            { icon: '✓', label: 'Tugas Selesai', value: approvedTasks, color: 'text-primary' },
            { icon: '⏳', label: 'Tugas Aktif', value: pendingTasks, color: 'text-accent-gold' },
            { icon: '📋', label: 'Izin Menunggu', value: pendingLeave, color: 'text-blue-400' },
          ].map((s) => (
            <div key={s.label} className="bg-bg-card border border-surface rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-sm">{s.label}</span>
                <span className="text-xl">{s.icon}</span>
              </div>
              <div className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Leave Requests Pending Approval */}
        {pendingLeave > 0 && (
          <div className="bg-bg-card border border-surface rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-surface flex items-center justify-between">
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
        <div className="bg-bg-card border border-surface rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface">
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
        <div className="bg-bg-card border border-surface rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface">
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
        <div className="bg-bg-card border border-surface rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface">
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

