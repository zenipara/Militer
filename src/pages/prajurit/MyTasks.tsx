import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import TaskCard from '../../components/ui/TaskCard';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { useTasks } from '../../hooks/useTasks';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { CardListSkeleton } from '../../components/common/Skeleton';
import type { Task, TaskStatus } from '../../types';

export default function MyTasks() {
  const { user } = useAuthStore();
  const { showNotification } = useUIStore();
  const { tasks, isLoading, updateTaskStatus, submitTaskReport } = useTasks({ assignedTo: user?.id });

  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filtered = tasks.filter((t) => !filterStatus || t.status === filterStatus);

  const handleStartTask = async (task: Task) => {
    try {
      await updateTaskStatus(task.id, 'in_progress');
      showNotification('Status tugas diperbarui', 'success');
    } catch {
      showNotification('Gagal memperbarui tugas', 'error');
    }
  };

  const handleSubmitReport = async () => {
    if (!selectedTask || !reportText.trim()) {
      showNotification('Isi laporan tidak boleh kosong', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await submitTaskReport(selectedTask.id, reportText);
      showNotification('Laporan berhasil dikirim!', 'success');
      setShowReport(false);
      setSelectedTask(null);
      setReportText('');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Gagal mengirim laporan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const statusFilters: { value: TaskStatus | ''; label: string }[] = [
    { value: '', label: 'Semua' },
    { value: 'pending', label: 'Menunggu' },
    { value: 'in_progress', label: 'Dikerjakan' },
    { value: 'done', label: 'Selesai' },
    { value: 'approved', label: 'Disetujui' },
  ];

  return (
    <DashboardLayout title="Tugas Saya">
      <div className="space-y-5">
        {/* Filter tabs */}
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

        {isLoading ? (
          <CardListSkeleton count={3} />
        ) : filtered.length === 0 ? (
          <div className="bg-bg-card border border-surface rounded-xl p-8 text-center text-text-muted">
            Tidak ada tugas
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((task) => (
              <div key={task.id} className="relative">
                <TaskCard task={task} />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  {task.status === 'pending' && (
                    <Button size="sm" variant="secondary" onClick={() => handleStartTask(task)}>
                      Mulai Kerjakan
                    </Button>
                  )}
                  {task.status === 'in_progress' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedTask(task);
                        setShowReport(true);
                      }}
                    >
                      Kirim Laporan
                    </Button>
                  )}
                  {task.status === 'done' && (
                    <span className="text-xs text-text-muted bg-surface px-3 py-1.5 rounded-lg">Menunggu persetujuan</span>
                  )}
                  {task.status === 'approved' && (
                    <span className="text-xs text-success bg-success/10 px-3 py-1.5 rounded-lg">✓ Disetujui</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Report Modal */}
      <Modal
        isOpen={showReport}
        onClose={() => { setShowReport(false); setReportText(''); }}
        title={`Laporan: ${selectedTask?.judul ?? ''}`}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowReport(false)}>Batal</Button>
            <Button onClick={handleSubmitReport} isLoading={isSaving}>Kirim Laporan</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            Jelaskan apa yang sudah Anda lakukan untuk tugas ini.
          </p>
          <textarea
            className="w-full rounded-lg border border-surface bg-bg-card px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
            rows={5}
            placeholder="Tuliskan laporan penyelesaian tugas..."
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
}
