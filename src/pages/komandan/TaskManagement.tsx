import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import TaskCard from '../../components/ui/TaskCard';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { TaskStatusBadge } from '../../components/common/Badge';
import { useTasks } from '../../hooks/useTasks';
import { useUsers } from '../../hooks/useUsers';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import type { Task, TaskReport, TaskStatus } from '../../types';
import { CardListSkeleton } from '../../components/common/Skeleton';

export default function TaskManagement() {
  const { user } = useAuthStore();
  const { showNotification } = useUIStore();
  const { tasks, isLoading, createTask, approveTask, rejectTask, getTaskReport } = useTasks({ assignedBy: user?.id });
  const { users } = useUsers({ role: 'prajurit', isActive: true });

  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskReport, setTaskReport] = useState<TaskReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState({
    judul: '',
    deskripsi: '',
    assigned_to: '',
    deadline: '',
    prioritas: 2 as 1 | 2 | 3,
  });

  const filtered = tasks.filter((t) => !filterStatus || t.status === filterStatus);

  const openDetail = async (task: Task) => {
    setSelectedTask(task);
    setShowDetail(true);
    setShowRejectForm(false);
    setRejectReason('');
    setTaskReport(null);
    if (task.status === 'done') {
      setLoadingReport(true);
      try {
        const report = await getTaskReport(task.id);
        setTaskReport(report as TaskReport | null);
      } finally {
        setLoadingReport(false);
      }
    }
  };

  const handleCreate = async () => {
    if (!form.judul || !form.assigned_to) {
      showNotification('Judul dan assignee wajib diisi', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await createTask({ ...form, satuan: user?.satuan });
      showNotification('Tugas berhasil dibuat', 'success');
      setShowCreate(false);
      setForm({ judul: '', deskripsi: '', assigned_to: '', deadline: '', prioritas: 2 });
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal membuat tugas', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedTask) return;
    setIsSaving(true);
    try {
      await approveTask(selectedTask.id);
      showNotification('Tugas disetujui ✓', 'success');
      setShowDetail(false);
    } catch {
      showNotification('Gagal menyetujui tugas', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTask) return;
    if (!rejectReason.trim()) {
      showNotification('Catatan penolakan wajib diisi', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await rejectTask(selectedTask.id, rejectReason);
      showNotification('Tugas dikembalikan untuk revisi', 'info');
      setShowDetail(false);
      setShowRejectForm(false);
    } catch {
      showNotification('Gagal menolak tugas', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const statusFilters: { value: TaskStatus | ''; label: string }[] = [
    { value: '', label: 'Semua' },
    { value: 'pending', label: 'Menunggu' },
    { value: 'in_progress', label: 'Dikerjakan' },
    { value: 'done', label: 'Perlu Ditinjau' },
    { value: 'approved', label: 'Disetujui' },
    { value: 'rejected', label: 'Ditolak' },
  ];

  return (
    <DashboardLayout title="Manajemen Tugas">
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2 flex-wrap">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterStatus(f.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === f.value
                    ? 'bg-primary text-white'
                    : 'bg-surface text-text-muted hover:text-text-primary'
                }`}
              >
                {f.label}
                {f.value !== '' && (
                  <span className="ml-1.5 text-xs opacity-70">
                    ({tasks.filter((t) => t.status === f.value).length})
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="sm:ml-auto">
            <Button onClick={() => setShowCreate(true)}>+ Buat Tugas</Button>
          </div>
        </div>

        {/* Task list */}
        {isLoading ? (
          <CardListSkeleton count={4} />
        ) : filtered.length === 0 ? (
          <div className="bg-bg-card border border-surface rounded-xl p-8 text-center text-text-muted">
            Tidak ada tugas
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                showAssignee
                actionLabel={task.status === 'done' ? '📋 Tinjau Laporan' : 'Detail'}
                onAction={() => openDetail(task)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Buat Tugas Baru"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button onClick={handleCreate} isLoading={isSaving}>Buat Tugas</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Judul Tugas *" type="text" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} required />
          <div>
            <label className="text-sm font-medium text-text-primary">Deskripsi</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-surface bg-bg-card px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
              rows={3}
              placeholder="Detail tugas yang harus dilakukan..."
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Ditugaskan ke *</label>
            <select
              className="mt-1 w-full rounded-lg border border-surface bg-bg-card px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
              value={form.assigned_to}
              onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
            >
              <option value="">Pilih Personel...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.pangkat ? `${u.pangkat} ` : ''}{u.nama} — {u.nrp}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-text-primary">Prioritas</label>
              <select
                className="mt-1 w-full rounded-lg border border-surface bg-bg-card px-3 py-2 text-text-primary focus:outline-none focus:border-primary"
                value={form.prioritas}
                onChange={(e) => setForm({ ...form, prioritas: Number(e.target.value) as 1 | 2 | 3 })}
              >
                <option value={1}>1 — Tinggi</option>
                <option value={2}>2 — Sedang</option>
                <option value={3}>3 — Rendah</option>
              </select>
            </div>
            <Input label="Deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Task Detail / Approval Modal */}
      {selectedTask && (
        <Modal
          isOpen={showDetail}
          onClose={() => { setShowDetail(false); setShowRejectForm(false); }}
          title={selectedTask.status === 'done' ? '📋 Tinjau Laporan Tugas' : 'Detail Tugas'}
          size="lg"
          footer={
            selectedTask.status === 'done' && !showRejectForm ? (
              <>
                <Button variant="ghost" onClick={() => setShowDetail(false)}>Tutup</Button>
                <Button variant="danger" onClick={() => setShowRejectForm(true)}>
                  Tolak & Minta Revisi
                </Button>
                <Button onClick={handleApprove} isLoading={isSaving}>✓ Setujui</Button>
              </>
            ) : selectedTask.status === 'done' && showRejectForm ? (
              <>
                <Button variant="ghost" onClick={() => setShowRejectForm(false)}>Kembali</Button>
                <Button variant="danger" onClick={handleReject} isLoading={isSaving}>
                  Kirim Penolakan
                </Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => setShowDetail(false)}>Tutup</Button>
            )
          }
        >
          <div className="space-y-4">
            {/* Task info */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-text-primary text-base">{selectedTask.judul}</h3>
              <TaskStatusBadge status={selectedTask.status} />
            </div>
            {selectedTask.deskripsi && (
              <p className="text-sm text-text-muted">{selectedTask.deskripsi}</p>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-text-muted">Assignee:</span> <span className="text-text-primary">{selectedTask.assignee?.nama ?? '—'}</span></div>
              <div><span className="text-text-muted">NRP:</span> <span className="font-mono text-text-primary">{selectedTask.assignee?.nrp ?? '—'}</span></div>
              <div><span className="text-text-muted">Prioritas:</span> <span className="text-text-primary">{selectedTask.prioritas === 1 ? '🔴 Tinggi' : selectedTask.prioritas === 2 ? '🟡 Sedang' : '🟢 Rendah'}</span></div>
              <div><span className="text-text-muted">Deadline:</span> <span className="text-text-primary">{selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString('id-ID') : '—'}</span></div>
            </div>

            {/* Task Report (only for 'done' tasks) */}
            {selectedTask.status === 'done' && (
              <div className="border-t border-surface pt-4">
                <h4 className="text-sm font-semibold text-text-primary mb-2">📄 Laporan Prajurit</h4>
                {loadingReport ? (
                  <div className="space-y-2">
                    <div className="h-4 animate-pulse bg-surface/70 rounded w-full" />
                    <div className="h-4 animate-pulse bg-surface/70 rounded w-3/4" />
                  </div>
                ) : taskReport ? (
                  <div className="bg-surface/30 rounded-lg p-3 text-sm text-text-primary whitespace-pre-line">
                    {taskReport.isi_laporan}
                    {taskReport.file_url && (
                      <a
                        href={taskReport.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-1 text-primary text-xs hover:underline"
                      >
                        📎 Lihat lampiran
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted italic">Tidak ada laporan terlampir.</p>
                )}
              </div>
            )}

            {/* Rejection form */}
            {showRejectForm && (
              <div className="border-t border-surface pt-4">
                <h4 className="text-sm font-semibold text-accent-red mb-2">✗ Catatan Penolakan</h4>
                <p className="text-xs text-text-muted mb-2">
                  Jelaskan alasan penolakan. Tugas akan dikembalikan ke status "Dikerjakan" agar prajurit dapat merevisi.
                </p>
                <textarea
                  className="w-full rounded-lg border border-surface bg-bg-card px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-red"
                  rows={4}
                  placeholder="Tuliskan catatan penolakan dan hal yang perlu diperbaiki..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
